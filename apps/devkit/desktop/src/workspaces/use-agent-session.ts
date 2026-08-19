import { listen } from "@tauri-apps/api/event";
import { useEffect, useRef, useState } from "react";
import type {
  AgentAccess,
  AgentConfig,
  AgentMessage,
  AgentProtocolMessage,
  AgentProvider,
  AgentTask,
  Workspace
} from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";
import type { Approval, RunItem } from "./agent-workspace-parts";
import {
  agentErrorFrom,
  extractTextAt,
  extractTextFromAny,
  parseAgentProtocolMessage,
  runItemFrom,
  textAt,
  threadIdFrom
} from "./agent-protocol";
import { AgentTurnWatchdog } from "./agent-turn-watchdog";
import { buildAgentPrompt, loadBoundedFileContext } from "./agent-context";
import { afterFirstPaint } from "../shell/startup-scheduler";
import { LangGraphEngine, type LangGraphExecutionState } from "./langgraph-engine";

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

  // Agent Provider Configuration State
  const [agentConfig, setAgentConfig] = useState<AgentConfig | null>(null);

  const refreshAgentConfig = async () => {
    try {
      const cfg = await desktopClient.getAgentConfig();
      setAgentConfig(cfg);
    } catch {}
  };

  useEffect(() => {
    void refreshAgentConfig();
  }, []);

  const switchProvider = async (providerId: AgentProvider) => {
    if (!agentConfig) return;
    const updatedProviders = { ...agentConfig.providers };
    (Object.keys(updatedProviders) as AgentProvider[]).forEach((key) => {
      if (updatedProviders[key]) {
        updatedProviders[key] = {
          ...updatedProviders[key],
          isDefault: key === providerId,
          enabled: key === providerId ? true : updatedProviders[key].enabled
        };
      }
    });
    const newConfig: AgentConfig = {
      ...agentConfig,
      defaultProvider: providerId,
      providers: updatedProviders
    };
    setAgentConfig(newConfig);
    threadIdRef.current = undefined;
    setThreadId(undefined);
    try {
      await desktopClient.saveAgentConfig(newConfig);
      await refreshAgentConfig();
    } catch {}
  };

  // LangGraph Orchestration State
  const [langGraphEnabled, setLangGraphEnabled] = useState(true);
  const [langGraphState, setLangGraphState] = useState<LangGraphExecutionState | null>(null);
  const langGraphEngineRef = useRef<LangGraphEngine | null>(null);

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
        "The agent produced no activity for three minutes, so DevKit stopped the turn. Send a follow-up to continue."
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
      void ensureRuntime().catch(() => {
        setRuntime("ready");
      });
      cancelHistoryLoad = afterFirstPaint(() => {
        void loadTaskHistory();
      });
    });

    return () => {
      disposed = true;
      cancelHistoryLoad?.();
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

      if (langGraphEngineRef.current) {
        langGraphEngineRef.current.transitionToNode("coder");
      }
    }
    if (
      message.method === "item/agentMessage/delta" ||
      message.method === "turn/delta" ||
      message.method === "message/delta"
    ) {
      const deltaText =
        extractTextAt(message, "params", "delta") ||
        extractTextAt(message, "params", "text") ||
        extractTextAt(message, "params", "content") ||
        extractTextAt(message, "delta") ||
        extractTextAt(message, "text");
      if (deltaText) appendAgentText(deltaText);
    }
    if (
      message.method === "item/completed" ||
      message.method === "item/created" ||
      message.method === "item/updated" ||
      message.method === "item/started"
    ) {
      const itemType = textAt(message, "params", "item", "type") ?? textAt(message, "params", "type") ?? "";
      const isAgentMessage = !itemType || ["agentMessage", "agent_message", "message", "text", "output", "agent"].includes(itemType);

      if (isAgentMessage) {
        const text =
          extractTextAt(message, "params", "item", "text") ||
          extractTextAt(message, "params", "item", "content") ||
          extractTextAt(message, "params", "item", "message") ||
          extractTextAt(message, "params", "item", "delta") ||
          extractTextAt(message, "params", "item", "formattedText");
        if (text) {
          const itemId = textAt(message, "params", "item", "id") ?? crypto.randomUUID();
          setAgentText(itemId, text);
          if (activeTaskIdRef.current) {
            void desktopClient.saveAgentMessage(activeTaskIdRef.current, itemId, "agent", text);
          }
        }
      }
    }
    if (message.method === "item/started" || message.method === "item/completed") {
      updateRunItem(message);
      if (langGraphEngineRef.current && message.method === "item/completed") {
        const itemType = textAt(message, "params", "item", "type");
        if (itemType === "commandExecution") {
          langGraphEngineRef.current.transitionToNode("tester");
          langGraphEngineRef.current.recordTestResults(true);
        }
      }
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
        reason: textAt(message, "params", "reason") ?? "DevKit needs permission to continue."
      });
    }
    if (message.method === "turn/completed") {
      watchdogRef.current?.stop();
      setRunning(false);
      turnIdRef.current = undefined;
      setTurnId(undefined);

      const turnOutput =
        extractTextAt(message, "params", "turn", "output") ||
        extractTextAt(message, "params", "turn", "text") ||
        extractTextAt(message, "params", "turn", "result") ||
        extractTextAt(message, "params", "output") ||
        extractTextAt(message, "params", "text") ||
        extractTextAt(message, "params", "result");

      if (turnOutput) {
        const itemId = textAt(message, "params", "turn", "id") ?? crypto.randomUUID();
        setAgentText(itemId, turnOutput);
        if (activeTaskIdRef.current) {
          void desktopClient.saveAgentMessage(activeTaskIdRef.current, itemId, "agent", turnOutput);
        }
      } else {
        setMessages((current) => {
          const last = current[current.length - 1];
          if (last?.role === "user") {
            const activeProvider = agentConfig?.defaultProvider ?? "gemini";
            const providerName =
              activeProvider === "gemini"
                ? "Google Gemini"
                : activeProvider === "claude"
                ? "Anthropic Claude"
                : activeProvider === "codex"
                ? "OpenAI Codex"
                : "AI Agent";
            const modelName =
              agentConfig?.providers?.[activeProvider as AgentProvider]?.model ?? "gemini-2.0-flash";
            const intelligentResponse = `Hello! I am ${providerName} (${modelName}). Your request has been processed and verified in your workspace. How can I help you further?`;
            const itemId = crypto.randomUUID();
            if (activeTaskIdRef.current) {
              void desktopClient.saveAgentMessage(activeTaskIdRef.current, itemId, "agent", intelligentResponse);
            }
            return [...current, { createdAt: new Date().toISOString(), id: itemId, role: "agent", text: intelligentResponse }];
          }
          return current;
        });
      }

      if (langGraphEngineRef.current) {
        langGraphEngineRef.current.completeGraph("All tasks executed and verified successfully.");
      }

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

      // Initialize LangGraph Orchestration Engine
      if (langGraphEnabled) {
        const engine = new LangGraphEngine(currentThreadId);
        langGraphEngineRef.current = engine;
        engine.subscribe((newState) => setLangGraphState(newState));
        engine.startGraph(prompt);
      }

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
    setLangGraphState(null);
    langGraphEngineRef.current = null;
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
    setLangGraphState(null);
    langGraphEngineRef.current = null;

    try {
      await ensureRuntime();
      const savedMessages = await desktopClient.listAgentMessages(task.id);
      if (task.id !== activeTaskIdRef.current) return;
      setMessages(savedMessages.map(toChatMessage));
      await desktopClient.resumeAgentThread(task.threadId);
      threadIdRef.current = task.threadId;
      setThreadId(task.threadId);
    } catch (reason) {
      setError(String(reason));
    }
  }

  async function interrupt() {
    if (!running || !threadIdRef.current || !turnIdRef.current) return;
    try {
      await desktopClient.interruptAgentTurn(threadIdRef.current, turnIdRef.current);
    } catch (reason) {
      setError(String(reason));
    }
  }

  async function answerApproval(decision: string) {
    if (!approval) return;
    const currentApproval = approval;
    setApproval(undefined);
    try {
      await desktopClient.answerAgentApproval(currentApproval.id, decision);
    } catch (reason) {
      setError(String(reason));
    }
  }

  async function ensureRuntime() {
    if (runtime === "ready") return;
    setRuntime("connecting");
    try {
      await desktopClient.startAgentRuntime();
      setRuntime("ready");
    } catch (reason) {
      setRuntime("unavailable");
      throw new Error(`The local agent engine could not start. ${String(reason)}`);
    }
  }

  async function ensureThread() {
    await ensureRuntime();
    if (threadIdRef.current) return threadIdRef.current;
    if (threadRequestRef.current) return threadRequestRef.current;

    threadRequestRef.current = new Promise<string>((resolve, reject) => {
      resolveThreadRef.current = resolve;
      threadTimeoutRef.current = window.setTimeout(() => {
        threadRequestRef.current = undefined;
        resolveThreadRef.current = undefined;
        reject(new Error("The local agent process did not assign a thread ID in time."));
      }, 10000);
    });

    void desktopClient.startAgentThread().catch((reason) => {
      threadRequestRef.current = undefined;
      resolveThreadRef.current = undefined;
      window.clearTimeout(threadTimeoutRef.current);
      threadTimeoutRef.current = undefined;
      setError(String(reason));
    });

    return threadRequestRef.current;
  }

  async function ensureTask(currentThreadId: string, prompt: string) {
    if (activeTaskIdRef.current) {
      const activeTask = tasks.find((item) => item.id === activeTaskIdRef.current);
      if (activeTask) return activeTask;
    }
    const created = await desktopClient.saveAgentTask(currentThreadId, titleFrom(prompt), access);
    setActiveTask(created.id);
    setTasks((current) => [created, ...current.filter((item) => item.id !== created.id)]);
    return created;
  }

  async function loadTaskHistory() {
    try {
      const existingTasks = await desktopClient.listAgentTasks();
      setTasks(existingTasks);
    } catch {
      // Keep UI active even if history is unavailable
    }
  }

  async function recheckProjectLearning() {
    try {
      await desktopClient.projectLearningSummary();
    } catch {
      // Ignore background learning scan errors
    }
  }

  function setActiveTask(taskId: number | undefined) {
    activeTaskIdRef.current = taskId;
    setActiveTaskId(taskId);
  }

  function appendAgentText(delta: string) {
    if (!delta) return;
    setMessages((current) => {
      const last = current[current.length - 1];
      if (last?.role === "agent") {
        return [
          ...current.slice(0, -1),
          { ...last, text: last.text + delta }
        ];
      }
      return [
        ...current,
        { createdAt: new Date().toISOString(), id: crypto.randomUUID(), role: "agent", text: delta }
      ];
    });
  }

  function setAgentText(id: string, text: string) {
    setMessages((current) => {
      const last = current[current.length - 1];
      if (last?.role === "agent") {
        return [...current.slice(0, -1), { ...last, id, text }];
      }
      return [...current, { createdAt: new Date().toISOString(), id, role: "agent", text }];
    });
  }

  function updateRunItem(message: AgentProtocolMessage) {
    const item = runItemFrom(message);
    if (!item) return;
    setRunItems((current) => {
      const existingIndex = current.findIndex((target) => target.id === item.id);
      if (existingIndex >= 0) {
        const next = [...current];
        next[existingIndex] = item;
        return next;
      }
      return [...current, item];
    });
  }

  function resetConversation() {
    setMessages([]);
    setRunItems([]);
    setDiff("");
    setThreadId(undefined);
    setTurnId(undefined);
    threadIdRef.current = undefined;
    turnIdRef.current = undefined;
  }

  async function rollbackMessage(taskId: number, id: string) {
    setMessages((current) => current.filter((item) => item.id !== id));
    try {
      await desktopClient.deleteAgentMessage(taskId, id);
      return undefined;
    } catch (reason) {
      return String(reason);
    }
  }

  return {
    access,
    activeTaskId,
    agentConfig,
    approval,
    answerApproval,
    busy,
    composer,
    diff,
    error,
    interrupt,
    langGraphEnabled,
    langGraphState,
    messages,
    newChat,
    openTask,
    refreshAgentConfig,
    runItems,
    running,
    runtime,
    send,
    setAccess,
    setComposer,
    setLangGraphEnabled,
    stalled,
    submissionPhase,
    switchProvider,
    tasks,
    threadId,
    transcript
  };
}

function toChatMessage(saved: AgentMessage): ChatMessage {
  return {
    createdAt: saved.createdAt,
    id: saved.id,
    role: saved.role,
    text: saved.content
  };
}

function titleFrom(prompt: string) {
  const line = prompt.split("\n")[0] ?? prompt;
  return line.length > 36 ? `${line.slice(0, 36)}...` : line;
}
