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
  parseAgentProtocolMessage,
  runItemFrom,
  textAt,
  threadIdFrom
} from "./agent-protocol";

export type ChatMessage = { id: string; role: "agent" | "user"; text: string };

export function useAgentSession({
  onRefreshChanges,
  workspace
}: {
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
  const [runtime, setRuntime] = useState<"connecting" | "ready" | "unavailable">(
    "connecting"
  );
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [threadId, setThreadId] = useState<string>();
  const [turnId, setTurnId] = useState<string>();
  const activeTaskIdRef = useRef<number | undefined>(undefined);
  const transcript = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let stopEvents: (() => void) | undefined;
    let stopErrors: (() => void) | undefined;
    void Promise.all([
      listen<unknown>("agent-event", (event) => {
        const message = parseAgentProtocolMessage(event.payload);
        if (message) handleAgentEvent(message);
      }),
      listen<unknown>("agent-error", (event) => {
        const message = textAt(parseAgentProtocolMessage(event.payload), "params", "message");
        if (message) setError(message);
      })
    ]).then(async ([events, errors]) => {
      stopEvents = events;
      stopErrors = errors;
      try {
        await desktopClient.startAgentRuntime();
        if (disposed) return;
        setRuntime("ready");
        const savedTasks = await desktopClient.listAgentTasks();
        if (disposed) return;
        setTasks(savedTasks);
        if (savedTasks[0]) await openTask(savedTasks[0]);
        else await desktopClient.startAgentThread();
      } catch (reason) {
        if (!disposed) {
          setRuntime("unavailable");
          setError(String(reason));
        }
      }
    });
    return () => {
      disposed = true;
      stopEvents?.();
      stopErrors?.();
    };
  }, []);

  useEffect(() => {
    transcript.current?.scrollTo({ behavior: "smooth", top: transcript.current.scrollHeight });
  }, [messages, runItems]);

  function handleAgentEvent(message: AgentProtocolMessage) {
    const nextThread = threadIdFrom(message);
    if (nextThread) setThreadId(nextThread);
    if (message.method === "turn/started") {
      setTurnId(textAt(message, "params", "turn", "id"));
      setRunning(true);
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
      setRunning(false);
      setTurnId(undefined);
      void onRefreshChanges();
      void recheckProjectLearning();
    }
    if (message.error?.message) setError(message.error.message);
  }

  async function send() {
    const prompt = composer.trim();
    if (!prompt || !threadId || running) return;
    setComposer("");
    setError(undefined);
    setRunItems([]);
    setDiff("");
    const message = { id: crypto.randomUUID(), role: "user" as const, text: prompt };
    try {
      const task = await ensureTask(threadId, prompt);
      await desktopClient.saveAgentMessage(task.id, message.id, message.role, message.text);
      setMessages((current) => [...current, message]);
      setRunning(true);
      const learningContext = await desktopClient.projectLearningContext();
      await desktopClient.sendAgentTurn(
        threadId,
        promptWithLearning(prompt, learningContext),
        access
      );
    } catch (reason) {
      setRunning(false);
      setError(String(reason));
    }
  }

  async function newChat() {
    if (running) return;
    setActiveTask(undefined);
    resetConversation();
    try {
      await desktopClient.startAgentThread();
    } catch (reason) {
      setError(String(reason));
    }
  }

  async function openTask(task: AgentTask) {
    if (running || task.id === activeTaskIdRef.current) return;
    setError(undefined);
    setThreadId(undefined);
    setRunItems([]);
    setDiff("");
    setAccess(task.access);
    setActiveTask(task.id);
    try {
      const savedMessages = await desktopClient.listAgentMessages(task.id);
      setMessages(savedMessages.map(toChatMessage));
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
      await desktopClient.saveAgentMessage(taskId, id, role, text);
      setTasks((current) => {
        const task = current.find((entry) => entry.id === taskId);
        return task ? [task, ...current.filter((entry) => entry.id !== taskId)] : current;
      });
    } catch (reason) {
      setError(`The response arrived but could not be saved. ${String(reason)}`);
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
    setError(undefined);
  }

  function appendAgentText(delta: string) {
    if (!delta) return;
    setMessages((current) => {
      const last = current.at(-1);
      if (last?.role === "agent") {
        return [...current.slice(0, -1), { ...last, text: last.text + delta }];
      }
      return [...current, { id: crypto.randomUUID(), role: "agent", text: delta }];
    });
  }

  function setAgentText(id: string, text: string) {
    if (!text) return;
    setMessages((current) => {
      const last = current.at(-1);
      if (last?.role === "agent") return [...current.slice(0, -1), { id, role: "agent", text }];
      return [...current, { id, role: "agent", text }];
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
    tasks,
    threadId,
    transcript,
    turnId,
    workspace
  };
}

function toChatMessage(message: AgentMessage): ChatMessage {
  return { id: message.id, role: message.role, text: message.content };
}

function taskTitle(prompt: string) {
  return prompt.length <= 80 ? prompt : `${prompt.slice(0, 77).trimEnd()}...`;
}

export function promptWithLearning(prompt: string, learningContext: string) {
  if (!learningContext) return prompt;
  return `${learningContext}\n\n<user_request>\n${prompt}\n</user_request>`;
}
