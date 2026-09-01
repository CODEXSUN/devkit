import { Bot, SendHorizontal, Square, Wrench } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { AgentMessageCard, type AgentShareInput } from "./AgentMessageCard";
import { CoworkerClient } from "./client";
import { AgentFlowPreferences, type AgentFlowPreferencesValue } from "./AgentFlowPreferences";
import type { AgentAccessMode } from "./client";
import {
  ComposerSymbolButtons,
  ComposerSymbolHelp,
  ComposerSuggestions,
  useComposerSymbols
} from "./composer-symbols";
import { useAgentChat } from "./use-agent-chat";
import { TodoClient } from "./todo-client";

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
  const [draft, setDraft] = useState("");
  const [access, setAccess] = useState<AgentAccessMode>("read-only");
  const [flowPreferences, setFlowPreferences] = useState<AgentFlowPreferencesValue>({
    evidenceExpanded: false,
    reducedMotion: false
  });
  const {
    conversationId,
    elapsedMs,
    error,
    messages,
    project,
    resolveApproval,
    running,
    send: sendMessage,
    setFeedback,
    stop
  } = useAgentChat({
    apiUrl,
    onConversationChange,
    selectedConversationId,
    selectedProjectId,
    token
  });
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const todoClient = useMemo(() => new TodoClient(apiUrl, token), [apiUrl, token]);
  const coworkerClient = useMemo(() => new CoworkerClient(apiUrl, () => token), [apiUrl, token]);
  const [creatingTasks, setCreatingTasks] = useState(false);
  const [taskError, setTaskError] = useState("");
  const [sharingMessageId, setSharingMessageId] = useState("");
  const [shareNotice, setShareNotice] = useState("");
  const symbols = useComposerSymbols({
    inputRef,
    onChange: setDraft,
    tags: messageTags(messages.map((message) => message.text)),
    value: draft
  });

  useEffect(() => {
    if (!project || running) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [project?.id, running]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: running ? "auto" : "smooth" });
  }, [messages, running]);

  async function submitMessage(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !project || running) return;
    setDraft("");
    await sendMessage(text, access);
    inputRef.current?.focus();
  }

  async function createTasks(tasks: string[], acceptance: string[], tests: string[]) {
    if (!project || !tasks.length || creatingTasks) return false;
    setCreatingTasks(true);
    setTaskError("");
    try {
      const provenance = conversationId
        ? `Source agent conversation: ${conversationId}`
        : "Source agent conversation: current session";
      const criteria = acceptance.length
        ? `Acceptance criteria:\n${acceptance.map((item) => `- ${item}`).join("\n")}`
        : "";
      const testPlan = tests.length
        ? `Test plan:\n${tests.map((item) => `- ${item}`).join("\n")}`
        : "";
      await todoClient.createBatch(
        tasks.map((title) => ({
          category: "agent-plan",
          description: [provenance, criteria, testPlan].filter(Boolean).join("\n\n"),
          groupName: "Agent plan",
          priority: "medium",
          projectId: project.id,
          status: "open",
          title,
          visibility: "private"
        }))
      );
      return true;
    } catch (reason) {
      setTaskError(messageFrom(reason));
      return false;
    } finally {
      setCreatingTasks(false);
    }
  }

  async function shareResponse(input: AgentShareInput): Promise<boolean> {
    if (!project || sharingMessageId) return false;
    const { content, target, title } = input;
    const description = [
      conversationId ? `Source agent conversation: ${conversationId}` : "Source agent conversation",
      "",
      content
    ].join("\n");
    setSharingMessageId(`${target}:${title}`);
    setShareNotice("");
    try {
      if (target === "task") {
        await todoClient.create({
          category: "agent-response",
          description,
          groupName: "Agent response",
          priority: "medium",
          projectId: project.id,
          status: "open",
          title,
          visibility: "private"
        });
      } else {
        await coworkerClient.createProjectRecord("discussion", {
          description,
          key: `agent-${target}-${crypto.randomUUID().slice(0, 8)}`,
          lane: conversationId ? `agent:${conversationId}` : "agent",
          referenceId: project.id,
          referenceType: "project",
          status: "open",
          title,
          type: target === "module" ? "module-proposal" : target
        });
      }
      setShareNotice(`Saved to ${shareTargetLabel(target)}.`);
      return true;
    } catch (reason) {
      setTaskError(messageFrom(reason));
      return false;
    } finally {
      setSharingMessageId("");
    }
  }

  return (
    <section
      className={`messenger-agent-space${flowPreferences.reducedMotion ? " reduce-agent-motion" : ""}`}
    >
      <section className="messenger-agent-thread" aria-live="polite">
        {messages.length ? (
          messages.map((message, index) => {
            const active = running && message.role === "assistant" && index === messages.length - 1;
            return (
              <AgentMessageCard
                active={active}
                evidenceExpanded={flowPreferences.evidenceExpanded}
                key={message.id}
                message={message}
                onApproval={resolveApproval}
                onFeedback={setFeedback}
                creatingTasks={creatingTasks}
                onCreateTasks={createTasks}
                onShare={shareResponse}
                onRetry={() => void sendMessage(promptBefore(messages, index), access)}
                sharing={Boolean(sharingMessageId)}
              />
            );
          })
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
            <div className="messenger-agent-starters">
              {agentStarters.map((starter) => (
                <button
                  key={starter.label}
                  onClick={() => {
                    setAccess(starter.access);
                    setDraft(starter.prompt);
                    inputRef.current?.focus();
                  }}
                  type="button"
                >
                  {starter.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </section>
      {error ? (
        <p className="messenger-agent-error" role="status">
          {error}
        </p>
      ) : null}
      {taskError ? (
        <p className="messenger-agent-error" role="status">
          {taskError}
        </p>
      ) : null}
      {shareNotice ? (
        <p className="messenger-agent-notice" role="status">
          {shareNotice}
        </p>
      ) : null}
      <AgentFlowPreferences onChange={setFlowPreferences} value={flowPreferences} />
      <form className="messenger-agent-composer" onSubmit={submitMessage}>
        {symbols.trigger ? (
          <ComposerSuggestions
            onPick={symbols.insert}
            onSelect={symbols.setSelectedIndex}
            selectedIndex={symbols.selectedIndex}
            suggestions={symbols.suggestions}
            symbol={symbols.trigger.kind}
          />
        ) : null}
        <textarea
          aria-label="Ask the connected coding agent"
          disabled={!project || running}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (symbols.onKeyDown(event)) return;
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
          <div className="agent-composer-context">
            <span>{project?.title ?? "No project selected"}</span>
            <select
              aria-label="Agent access mode"
              disabled={running}
              onChange={(event) => setAccess(event.target.value as AgentAccessMode)}
              value={access}
            >
              <option value="read-only">Explore</option>
              <option value="plan">Plan</option>
              <option value="ask-approval">Build with approval</option>
            </select>
            <ComposerSymbolButtons insert={symbols.insert} />
            <ComposerSymbolHelp />
          </div>
          {running ? (
            <button
              aria-label={`Stop agent after ${formatDuration(elapsedMs)}`}
              className="agent-stop-button"
              onClick={stop}
              title="Stop"
              type="button"
            >
              <Square size={13} />
            </button>
          ) : (
            <button aria-label="Send agent task" disabled={!draft.trim() || !project} type="submit">
              <SendHorizontal size={17} />
            </button>
          )}
        </footer>
      </form>
    </section>
  );
}

function messageTags(messages: string[]) {
  return [
    ...new Set(
      messages.flatMap((message) =>
        [...message.matchAll(/#([\w.-]+)/gu)].map((match) => match[1]!.toLocaleLowerCase())
      )
    )
  ].sort();
}

function formatDuration(durationMs: number) {
  return durationMs < 1000 ? "a moment" : `${Math.round(durationMs / 1000)} seconds`;
}

function promptBefore(
  messages: Array<{ role: "assistant" | "user"; text: string }>,
  index: number
) {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const message = messages[cursor];
    if (message?.role === "user") return message.text;
  }
  return "";
}

function shareTargetLabel(target: AgentShareInput["target"]) {
  if (target === "module") return "Module proposals";
  return `${target[0]?.toUpperCase()}${target.slice(1)}s`;
}

const agentStarters = [
  {
    access: "read-only",
    label: "Explore an idea",
    prompt:
      "Help me explore a new idea. Challenge the assumptions, identify user value, risks, and practical options before recommending a direction."
  },
  {
    access: "plan",
    label: "Organize into tasks",
    prompt:
      "Turn this idea into an ordered implementation plan with clear tasks, dependencies, acceptance checks, and review gates: "
  },
  {
    access: "read-only",
    label: "Review this project",
    prompt:
      "Review this project globally. Identify the strongest improvements, correctness risks, missing tests, maintainability issues, and the next three high-value actions."
  },
  {
    access: "plan",
    label: "Plan implementation",
    prompt:
      "Inspect the project and prepare a careful implementation plan. Reuse existing modules, name the files and tests involved, and call out every approval boundary."
  }
] as const;

function messageFrom(reason: unknown) {
  return reason instanceof Error ? reason.message : "Tasks could not be created from this plan.";
}
