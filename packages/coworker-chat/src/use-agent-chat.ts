import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgentEventQueue } from "./agent-event-queue";
import {
  cancelAgentTurn,
  createAgentTurn,
  messageFromHistory,
  reduceAgentEvent,
  type AgentApproval,
  type AgentMessage
} from "./agent-chat-events";
import { CoworkerClient } from "./client";
import type { AgentAccessMode } from "./client";
import type { CoworkerEvent, CoworkerProject } from "./types";

export type { AgentAction, AgentMessage } from "./agent-chat-events";

export function useAgentChat({
  apiUrl,
  onConversationChange,
  selectedConversationId,
  selectedProjectId,
  token
}: {
  apiUrl: string;
  onConversationChange?: ((conversationId: string) => void) | undefined;
  selectedConversationId: string | null;
  selectedProjectId?: string | null | undefined;
  token: string;
}) {
  const client = useMemo(() => new CoworkerClient(apiUrl, () => token), [apiUrl, token]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [project, setProject] = useState<CoworkerProject | null>(null);
  const [running, setRunning] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);
  const activeAssistantRef = useRef<string | null>(null);
  const startedAtRef = useRef(0);

  useEffect(() => {
    let active = true;
    void client
      .projects()
      .then((projects) => {
        if (active) {
          setProject(projects.find((item) => item.id === selectedProjectId) ?? projects[0] ?? null);
        }
      })
      .catch((reason) => {
        if (active) setError(messageFrom(reason));
      });
    return () => {
      active = false;
    };
  }, [client, selectedProjectId]);

  useEffect(() => {
    if (selectedConversationId === conversationId) return;
    if (!selectedConversationId) {
      setConversationId(null);
      setThreadId(null);
      setMessages([]);
      setError("");
      return;
    }
    let active = true;
    setError("");
    void Promise.all([client.chat(selectedConversationId), client.projects()])
      .then(([detail, projects]) => {
        if (!active) return;
        setConversationId(detail.uuid);
        setThreadId(detail.codexThreadId);
        setProject(projects.find((item) => item.id === detail.projectUuid) ?? projects[0] ?? null);
        setMessages(detail.messages.map(messageFromHistory));
      })
      .catch((reason) => {
        if (active) setError(messageFrom(reason));
      });
    return () => {
      active = false;
    };
  }, [client, conversationId, selectedConversationId]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 250);
    return () => window.clearInterval(timer);
  }, [running]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const send = useCallback(
    async (message: string, access: AgentAccessMode = "read-only") => {
      const text = message.trim();
      if (!text || !project || running) return false;
      const turn = createAgentTurn(text);
      const controller = new AbortController();
      const startedAt = Date.now();
      controllerRef.current = controller;
      activeAssistantRef.current = turn.assistantId;
      startedAtRef.current = startedAt;
      setMessages((current) => [...current, ...turn.messages]);
      setError("");
      setElapsedMs(0);
      setRunning(true);
      const queue = new AgentEventQueue<CoworkerEvent>((event) => {
        const elapsed = Date.now() - startedAt;
        setElapsedMs(elapsed);
        setMessages((current) => reduceAgentEvent(current, turn.assistantId, event, elapsed));
        if (event.type === "chat.started") {
          setConversationId(event.conversationId);
          setThreadId(event.threadId);
          onConversationChange?.(event.conversationId);
        } else if (event.type === "chat.failed") {
          setError(event.message);
        }
      });
      try {
        await client.stream(
          { access, conversationId, message: text, project, threadId },
          (event) => queue.push(event),
          controller.signal
        );
        return true;
      } catch (reason) {
        if (controller.signal.aborted) return false;
        const failure = messageFrom(reason);
        setMessages((current) =>
          reduceAgentEvent(
            current,
            turn.assistantId,
            { message: failure, type: "chat.failed" },
            Date.now() - startedAt
          )
        );
        setError(failure);
        return false;
      } finally {
        controllerRef.current = null;
        activeAssistantRef.current = null;
        setRunning(false);
      }
    },
    [client, conversationId, onConversationChange, project, running, threadId]
  );

  const stop = useCallback(() => {
    const assistantId = activeAssistantRef.current;
    if (!assistantId || !controllerRef.current) return;
    controllerRef.current.abort();
    const elapsed = Date.now() - startedAtRef.current;
    setElapsedMs(elapsed);
    setMessages((current) => cancelAgentTurn(current, assistantId, elapsed));
    setRunning(false);
  }, []);

  const resolveApproval = useCallback(
    async (approval: AgentApproval, decision: "accept" | "acceptForSession" | "decline") => {
      await client.resolveApproval({ decision, requestId: approval.requestId, threadId: approval.threadId });
      setMessages((current) =>
        current.map((message) =>
          message.approval?.requestId === approval.requestId
            ? { ...message, approval: null }
            : message
        )
      );
    },
    [client]
  );

  const setFeedback = useCallback(
    async (messageId: string, feedback: "down" | "up" | null) => {
      await client.setMessageFeedback(messageId, feedback);
      setMessages((current) =>
        current.map((message) => (message.id === messageId ? { ...message, feedback } : message))
      );
    },
    [client]
  );

  return {
    conversationId,
    elapsedMs,
    error,
    messages,
    project,
    resolveApproval,
    running,
    send,
    setFeedback,
    stop
  };
}

function messageFrom(reason: unknown) {
  return reason instanceof Error
    ? reason.message
    : "The coding agent could not complete this task.";
}
