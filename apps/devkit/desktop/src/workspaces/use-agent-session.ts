import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import type {
  AgentAccess,
  AgentMessage,
  AgentProtocolMessage,
  AgentTask,
  Workspace
} from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";
import type { Approval, RunItem } from "./agent-workspace-parts";
import {
  agentErrorFrom,
  parseAgentProtocolMessage,
  runItemFrom,
  textAt,
  threadIdFrom
} from "./agent-protocol";
import { AgentTurnWatchdog } from "./agent-turn-watchdog";
import { buildAgentPrompt, loadBoundedFileContext } from "./agent-context";
import { afterFirstPaint } from "../shell/startup-scheduler";

export type ChatMessage = {
  id: string;
  role: "agent" | "user";
  text: string;
  createdAt: string;
};
export type SubmissionPhase = "idle" | "preparing" | "sending";

export function useAgentSession({
  contextPaths,
  onRefreshChanges,
  workspace
}: {
  contextPaths: string[];
  onRefreshChanges: () => Promise<void>;
  workspace: Workspace;
}) {
  const [access, setAccess] = useState<AgentAccess>("workspaceWrite");
  const [activeTaskId, setActiveTaskId] = useState<number>();
  const [approval, setApproval] = useState<Approval>();
  const [composer, setComposer] = useState("");
  const [diff, setDiff] = useState("");
  const [error, setError] = useState<string>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [runItems, setRunItems] = useState<RunItem[]>([]);
  const [running, setRunning] = useState(false);
  const [stalled, setStalled] = useState(false);
  const [submissionPhase, setSubmissionPhase] = useState<SubmissionPhase>("idle");
  const [runtime, setRuntime] = useState<"idle" | "connecting" | "ready" | "unavailable">("idle");
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [threadId, setThreadId] = useState<string>();
  const [turnId, setTurnId] = useState<string>();
  const activeTaskIdRef = useRef<number | undefined>(undefined);
  const threadIdRef = useRef<string | undefined>(undefined);
  const turnIdRef = useRef<string | undefined>(undefined);
  const runtimeRequestRef = useRef<Promise<void> | undefined>(undefined);
  const threadRequestRef = useRef<Promise<string> | undefined>(undefined);
  const resolveThreadRef = useRef<((threadId: string) => void) | undefined>(undefined);
  const threadTimeoutRef = useRef<number | undefined>(undefined);
  const transcript = useRef<HTMLDivElement>(null);
  const watchdogRef = useRef<AgentTurnWatchdog | undefined>(undefined);
  const busy = running || submissionPhase !== "idle";
  watchdogRef.current ??= new AgentTurnWatchdog({
    onRecovered: () => setStalled(false),
    onStalled: () => setStalled(true),
    onTimeout: () => {
      setStalled(false);
      setError(
        "The agent produced no activity for three minutes, so CodeLogix stopped the turn. Send a follow-up to continue."
      );
      const currentThreadId = threadIdRef.current;
      const currentTurnId = turnIdRef.current;
      if (currentThreadId && currentTurnId) {
        void desktopClient.interruptAgentTurn(currentThreadId, currentTurnId).catch((reason) => {
          setError(`The stalled turn could not be stopped. ${String(reason)}`);
        });
      }
    }
  });

  useEffect(() => {
    let disposed = false;
    let cancelHistoryLoad: (() => void) | undefined;
    let stopEvents: (() => void) | undefined;
    let stopErrors: (() => void) | undefined;
    void Promise.all([
      listen<unknown>("agent-event", (event) => {
        const message = parseAgentProtocolMessage(event.payload);
        if (message) handleAgentEvent(message);
      }),
      listen<unknown>("agent-error", (event) => {
        const message = agentErrorFrom(event.payload);
        if (message) setError(message);
      })
    ]).then(([events, errors]) => {
      if (disposed) {
        events();
        errors();
        return;
      }
      stopEvents = events;
      stopErrors = errors;
      cancelHistoryLoad = afterFirstPaint(() => {
        void desktopClient
          .listAgentTasks()
          .then((savedTasks) => {
            if (!disposed) setTasks(savedTasks);
          })
          .catch((reason) => {
            if (!disposed) setError(`Chat history is unavailable. ${String(reason)}`);
          });
      });
    });
    return () => {
      disposed = true;
      cancelHistoryLoad?.();
      window.clearTimeout(threadTimeoutRef.current);
      watchdogRef.current?.stop();
      stopEvents?.();
      stopErrors?.();
    };
  }, []);

  useEffect(() => {
    transcript.current?.scrollTo({ behavior: "smooth", top: transcript.current.scrollHeight });
  }, [messages, runItems]);

  function handleAgentEvent(message: AgentProtocolMessage) {
    watchdogRef.current?.touch();
    const nextThread = threadIdFrom(message);
    if (nextThread) {
      threadIdRef.current = nextThread;
      setThreadId(nextThread);
      resolveThreadRef.current?.(nextThread);
      resolveThreadRef.current = undefined;
      threadRequestRef.current = undefined;
      window.clearTimeout(threadTimeoutRef.current);
      threadTimeoutRef.current = undefined;
    }
    if (message.method === "turn/started") {
      const nextTurnId = textAt(message, "params", "turn", "id");
      turnIdRef.current = nextTurnId;
      setTurnId(nextTurnId);
      setRunning(true);
      watchdogRef.current?.start();
    }
    if (message.method === "item/agentMessage/delta") {
      appendAgentText(textAt(message, "params", "delta") ?? "");
    }
    if (
      message.method === "item/completed" &&
      textAt(message, "params", "item", "type") === "agentMessage"
    ) {
      const itemId = textAt(message, "params", "item", "id") ?? crypto.randomUUID();
      const text = textAt(message, "params", "item", "text") ?? "";
      setAgentText(itemId, text);
      void persistMessage(itemId, "agent", text);
    }
    if (message.method === "item/started" || message.method === "item/completed") {
      updateRunItem(message);
    }
    if (message.method === "turn/diff/updated") {
      setDiff(textAt(message, "params", "diff") ?? "");
    }
    if (
      ["item/commandExecution/requestApproval", "item/fileChange/requestApproval"].includes(
        message.method ?? ""
      ) &&
      message.id !== undefined
    ) {
      setApproval({
        id: message.id,
        command: textAt(message, "params", "command") ?? "Workspace file changes",
        reason: textAt(message, "params", "reason") ?? "Codex needs permission to continue."
      });
    }
    if (message.method === "turn/completed") {
      watchdogRef.current?.stop();
      setRunning(false);
      turnIdRef.current = undefined;
      setTurnId(undefined);
      void onRefreshChanges();
      void recheckProjectLearning();
    }
    if (message.error?.message) setError(message.error.message);
  }

  async function send() {
    const prompt = composer.trim();
    if (!prompt || busy) return;
    setComposer("");
    setError(undefined);
    setRunItems([]);
    setDiff("");
    const message = { id: crypto.randomUUID(), role: "user" as const, text: prompt };
    let savedMessage: { id: string; taskId: number } | undefined;
    try {
      setSubmissionPhase("preparing");
      const currentThreadId = await ensureThread();
      const [learningContext, fileContext] = await Promise.all([
        desktopClient.projectLearningContext(),
        loadBoundedFileContext(contextPaths, (path) => desktopClient.readFile(path))
      ]);
      const task = await ensureTask(currentThreadId, prompt);
      const persistedMessage = await desktopClient.saveAgentMessage(
        task.id,
        message.id,
        message.role,
        message.text
      );
      savedMessage = { id: message.id, taskId: task.id };
      setMessages((current) => [...current, toChatMessage(persistedMessage)]);
      setRunning(true);
      setSubmissionPhase("sending");
      await desktopClient.sendAgentTurn(
        currentThreadId,
        buildAgentPrompt(prompt, learningContext, fileContext),
        access
      );
    } catch (reason) {
      setRunning(false);
      const rollbackError = savedMessage
        ? await rollbackMessage(savedMessage.taskId, savedMessage.id)
        : undefined;
      setComposer((current) => current || prompt);
      setError(
        rollbackError
          ? `The prompt was not sent, and its saved draft could not be removed. ${rollbackError}`
          : `The prompt was not sent. ${String(reason)}`
      );
    } finally {
      setSubmissionPhase("idle");
    }
  }

  async function newChat() {
    if (busy) return;
    setActiveTask(undefined);
    resetConversation();
    try {
      await ensureThread();
    } catch (reason) {
      setError(String(reason));
    }
  }

  async function openTask(task: AgentTask) {
    if (busy || task.id === activeTaskIdRef.current) return;
    setError(undefined);
    setThreadId(undefined);
    threadIdRef.current = undefined;
    setRunItems([]);
    setDiff("");
    setAccess(task.access);
    setActiveTask(task.id);
    try {
      await ensureRuntime();
      const savedMessages = await desktopClient.listAgentMessages(task.id);
      setMessages(savedMessages.map(toChatMessage));
      threadIdRef.current = task.threadId;
      setThreadId(task.threadId);
      await desktopClient.resumeAgentThread(task.threadId);
    } catch (reason) {
      setError(`This saved task could not reconnect to Codex. ${String(reason)}`);
    }
  }

  async function decide(decision: "accept" | "acceptForSession" | "decline") {
    if (!approval) return;
    await desktopClient.answerAgentApproval(approval.id, decision);
    setApproval(undefined);
  }

  async function ensureRuntime() {
    if (runtime === "ready") return;
    if (runtimeRequestRef.current) return runtimeRequestRef.current;
    setRuntime("connecting");
    const request = desktopClient
      .startAgentRuntime()
      .then(() => setRuntime("ready"))
      .catch((reason) => {
        setRuntime("unavailable");
        throw reason;
      })
      .finally(() => {
        runtimeRequestRef.current = undefined;
      });
    runtimeRequestRef.current = request;
    return request;
  }

  async function ensureThread() {
    if (threadIdRef.current) return threadIdRef.current;
    await ensureRuntime();
    if (threadRequestRef.current) return threadRequestRef.current;
    const request = new Promise<string>((resolve, reject) => {
      resolveThreadRef.current = resolve;
      threadTimeoutRef.current = window.setTimeout(() => {
        resolveThreadRef.current = undefined;
        threadRequestRef.current = undefined;
        threadTimeoutRef.current = undefined;
        reject(new Error("Codex did not create a thread within 15 seconds."));
      }, 15_000);
      resolveThreadRef.current = (id) => {
        window.clearTimeout(threadTimeoutRef.current);
        threadTimeoutRef.current = undefined;
        resolve(id);
      };
    });
    threadRequestRef.current = request;
    try {
      await desktopClient.startAgentThread();
      return await request;
    } catch (reason) {
      window.clearTimeout(threadTimeoutRef.current);
      threadTimeoutRef.current = undefined;
      resolveThreadRef.current = undefined;
      threadRequestRef.current = undefined;
      throw reason;
    }
  }

  async function interrupt() {
    if (threadId && turnId) await desktopClient.interruptAgentTurn(threadId, turnId);
  }

  async function recheckProjectLearning() {
    try {
      const summary = await desktopClient.projectLearningSummary();
      if (summary.settings.autoScan) await desktopClient.scanProjectLearning();
    } catch (reason) {
      setError(`Project learning could not recheck the repository. ${String(reason)}`);
    }
  }

  async function ensureTask(currentThreadId: string, prompt: string) {
    const existing = tasks.find((task) => task.id === activeTaskIdRef.current);
    if (existing) {
      const task = await desktopClient.saveAgentTask(
        currentThreadId,
        existing.title,
        access
      );
      setTasks((current) => [task, ...current.filter((entry) => entry.id !== task.id)]);
      return task;
    }
    const task = await desktopClient.saveAgentTask(
      currentThreadId,
      taskTitle(prompt),
      access
    );
    setActiveTask(task.id);
    setTasks((current) => [task, ...current.filter((entry) => entry.id !== task.id)]);
    return task;
  }

  async function persistMessage(id: string, role: AgentMessage["role"], text: string) {
    const taskId = activeTaskIdRef.current;
    if (!taskId || !text) return;
    try {
      const message = await desktopClient.saveAgentMessage(taskId, id, role, text);
      setMessages((current) =>
        current.map((entry) =>
          entry.id === message.id ? { ...entry, createdAt: message.createdAt } : entry
        )
      );
      setTasks((current) => {
        const task = current.find((entry) => entry.id === taskId);
        return task ? [task, ...current.filter((entry) => entry.id !== taskId)] : current;
      });
    } catch (reason) {
      setError(`The response arrived but could not be saved. ${String(reason)}`);
    }
  }

  async function rollbackMessage(taskId: number, id: string) {
    try {
      await desktopClient.deleteAgentMessage(taskId, id);
      setMessages((current) => current.filter((message) => message.id !== id));
      return undefined;
    } catch (reason) {
      return String(reason);
    }
  }

  function setActiveTask(id: number | undefined) {
    activeTaskIdRef.current = id;
    setActiveTaskId(id);
  }

  function resetConversation() {
    setMessages([]);
    setRunItems([]);
    setDiff("");
    setThreadId(undefined);
    threadIdRef.current = undefined;
    setError(undefined);
  }

  function appendAgentText(delta: string) {
    if (!delta) return;
    setMessages((current) => {
      const last = current.at(-1);
      if (last?.role === "agent") {
        return [...current.slice(0, -1), { ...last, text: last.text + delta }];
      }
      return [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "agent",
          text: delta,
          createdAt: new Date().toISOString()
        }
      ];
    });
  }

  function setAgentText(id: string, text: string) {
    if (!text) return;
    setMessages((current) => {
      const last = current.at(-1);
      if (last?.role === "agent") {
        return [...current.slice(0, -1), { id, role: "agent", text, createdAt: last.createdAt }];
      }
      return [...current, { id, role: "agent", text, createdAt: new Date().toISOString() }];
    });
  }

  function updateRunItem(message: AgentProtocolMessage) {
    const item = runItemFrom(message);
    if (!item) return;
    setRunItems((current) => [
      ...current.filter((entry) => entry.id !== item.id),
      item
    ]);
  }

  return {
    access,
    activeTaskId,
    approval,
    busy,
    composer,
    decide,
    diff,
    error,
    interrupt,
    messages,
    newChat,
    openTask,
    runItems,
    running,
    runtime,
    send,
    setAccess,
    setComposer,
    stalled,
    submissionPhase,
    tasks,
    threadId,
    transcript,
    turnId,
    workspace
  };
}

function toChatMessage(message: AgentMessage): ChatMessage {
  return {
    id: message.id,
    role: message.role,
    text: message.content,
    createdAt: message.createdAt
  };
}

function taskTitle(prompt: string) {
  return prompt.length <= 80 ? prompt : `${prompt.slice(0, 77).trimEnd()}...`;
}
