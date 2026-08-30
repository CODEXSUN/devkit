import { Bot, Check, Circle, LoaderCircle, SendHorizontal, Wrench } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CoworkerClient } from "./client";
import type { CoworkerEvent, CoworkerProject } from "./types";

type AgentAction = Extract<CoworkerEvent, { type: "chat.action" }>["action"];
type AgentMessage = {
  actions: AgentAction[];
  id: string;
  role: "assistant" | "user";
  text: string;
};

export function AgentChatWorkspace({
  apiUrl,
  connected,
  onConversationChange,
  selectedProjectId,
  selectedConversationId,
  token
}: {
  apiUrl: string;
  connected: boolean;
  onConversationChange?: (conversationId: string) => void;
  selectedProjectId?: string | null;
  selectedConversationId: string | null;
  token: string;
}) {
  const client = useMemo(() => new CoworkerClient(apiUrl, () => token), [apiUrl, token]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [project, setProject] = useState<CoworkerProject | null>(null);
  const [running, setRunning] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

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
        setMessages(
          detail.messages.map((message) => ({
            actions: [],
            id: message.uuid,
            role: message.role,
            text: message.body
          }))
        );
      })
      .catch((reason) => {
        if (active) setError(messageFrom(reason));
      });
    return () => {
      active = false;
    };
  }, [client, conversationId, selectedConversationId]);
  useEffect(() => {
    inputRef.current?.focus();
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !project || running) return;
    const assistantId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      { actions: [], id: crypto.randomUUID(), role: "user", text },
      { actions: [], id: assistantId, role: "assistant", text: "" }
    ]);
    setDraft("");
    setError("");
    setRunning(true);
    try {
      await client.stream(
        { access: "read-only", conversationId, message: text, project, threadId },
        (agentEvent) => {
          if (agentEvent.type === "chat.started") {
            setConversationId(agentEvent.conversationId);
            setThreadId(agentEvent.threadId);
            onConversationChange?.(agentEvent.conversationId);
          } else if (agentEvent.type === "chat.delta") {
            updateAssistant(setMessages, assistantId, (message) => ({
              ...message,
              text: message.text + agentEvent.delta
            }));
          } else if (agentEvent.type === "chat.action") {
            updateAssistant(setMessages, assistantId, (message) => ({
              ...message,
              actions: upsertAction(message.actions, agentEvent.action)
            }));
          } else if (agentEvent.type === "chat.failed") {
            updateAssistant(setMessages, assistantId, (message) => ({
              ...message,
              text: message.text || agentEvent.message
            }));
            setError(agentEvent.message);
          }
        }
      );
    } catch (reason) {
      const message = messageFrom(reason);
      updateAssistant(setMessages, assistantId, (entry) => ({
        ...entry,
        text: entry.text || message
      }));
      setError(message);
    } finally {
      setRunning(false);
      inputRef.current?.focus();
    }
  }

  return (
    <section className="messenger-agent-space">
      <section className="messenger-agent-thread" aria-live="polite">
        {messages.length ? (
          messages.map((message) => (
            <article className={`messenger-agent-message ${message.role}`} key={message.id}>
              {message.role === "assistant" ? (
                <span className="messenger-agent-avatar">
                  <Bot size={16} />
                </span>
              ) : null}
              <div>
                {message.actions.length ? (
                  <div className="messenger-agent-actions">
                    {message.actions.map((action) => (
                      <div key={action.id}>
                        <ActionIcon status={action.status} />
                        <span>{action.label}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                <p>{message.text || (running ? "Working…" : "No response returned.")}</p>
              </div>
            </article>
          ))
        ) : (
          <div className="messenger-agent-empty">
            <span>
              <Bot size={22} />
            </span>
            <h1>Agent space</h1>
            <p>
              {project
                ? `Ready to inspect, search, plan, and review ${project.title}.`
                : connected
                  ? "Choose or link a project before starting a coding task."
                  : "Connecting to your local Codex agent…"}
            </p>
            <small>
              <Wrench size={13} /> Read-only coding tools enabled
            </small>
          </div>
        )}
        <div ref={endRef} />
      </section>
      {error ? (
        <p className="messenger-agent-error" role="status">
          {error}
        </p>
      ) : null}
      <form className="messenger-agent-composer" onSubmit={send}>
        <textarea
          aria-label="Ask the connected coding agent"
          disabled={!project || running}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={project ? "Ask Codex about this project" : "Link a project to begin"}
          ref={inputRef}
          rows={3}
          value={draft}
        />
        <footer>
          <span>{project?.title ?? "No project selected"}</span>
          <button
            aria-label="Send agent task"
            disabled={!draft.trim() || !project || running}
            type="submit"
          >
            {running ? <LoaderCircle className="spin" size={17} /> : <SendHorizontal size={17} />}
          </button>
        </footer>
      </form>
    </section>
  );
}

function ActionIcon({ status }: { status: string }) {
  if (status === "completed") return <Check size={13} />;
  if (status === "running") return <LoaderCircle className="spin" size={13} />;
  return <Circle size={13} />;
}

function updateAssistant(
  setMessages: React.Dispatch<React.SetStateAction<AgentMessage[]>>,
  id: string,
  update: (message: AgentMessage) => AgentMessage
) {
  setMessages((current) =>
    current.map((message) => (message.id === id ? update(message) : message))
  );
}

function upsertAction(actions: AgentAction[], action: AgentAction) {
  return [...actions.filter((entry) => entry.id !== action.id), action];
}

function messageFrom(reason: unknown) {
  return reason instanceof Error
    ? reason.message
    : "The coding agent could not complete this task.";
}
