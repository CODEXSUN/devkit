import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  Clipboard,
  LoaderCircle,
  FileCode2,
  ThumbsDown,
  ThumbsUp,
  RotateCcw,
  ShieldAlert
} from "lucide-react";
import { useState } from "react";
import type { AgentApproval, AgentMessage } from "./agent-chat-events";
import { AgentMarkdown } from "./AgentMarkdown";
import { AgentStructuredPlanCard } from "./AgentStructuredPlanCard";

type AgentMessageCardProps = {
  active: boolean;
  evidenceExpanded: boolean;
  message: AgentMessage;
  onApproval: (approval: AgentApproval, decision: "accept" | "acceptForSession" | "decline") => Promise<void>;
  onFeedback: (messageId: string, feedback: "down" | "up" | null) => Promise<void>;
  onCreateTasks?: ((tasks: string[], acceptance: string[], tests: string[]) => Promise<boolean>) | undefined;
  creatingTasks?: boolean | undefined;
  onRetry: () => void;
};

export function AgentMessageCard({
  active,
  evidenceExpanded,
  message,
  onApproval,
  onCreateTasks,
  creatingTasks = false,
  onFeedback,
  onRetry
}: AgentMessageCardProps) {
  const [actionsOpen, setActionsOpen] = useState(active);
  const showActions = active || evidenceExpanded || actionsOpen;
  const [copied, setCopied] = useState(false);
  const failedActions = message.actions.filter((action) => action.status === "failed").length;
  const completedActions = message.actions.filter((action) => action.status === "completed").length;

  async function copy() {
    await navigator.clipboard.writeText(message.text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <article className={`messenger-agent-message ${message.role}${active ? " streaming" : ""}`}>
      {message.role === "assistant" ? <span className="messenger-agent-avatar"><Bot size={16} /></span> : null}
      <div>
        {message.actions.length ? (
          <section className="messenger-agent-evidence">
            <button aria-expanded={showActions} onClick={() => setActionsOpen((open) => !open)} type="button">
              <span>{active ? "Working" : `${completedActions} actions`}{failedActions ? ` · ${failedActions} failed` : ""}</span>
              {showActions ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {showActions ? (
              <div className="messenger-agent-actions">
                {message.actions.map((action) => (
                  <div className={`is-${action.status}`} key={action.id}>
                    <ActionIcon status={action.status} />
                    <span>{action.label}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}
        {message.approval ? <ApprovalCard approval={message.approval} onResolve={onApproval} /> : null}
        {active && !message.text ? (
          <AgentActivity actions={message.actions} />
        ) : (
          <AgentMarkdown streaming={active} text={message.text} />
        )}
        {message.role === "assistant" && !active && onCreateTasks ? (
          <AgentStructuredPlanCard busy={creatingTasks} onCreateTasks={onCreateTasks} text={message.text} />
        ) : null}
        {message.files.length ? <ChangedFiles files={message.files} /> : null}
        {message.role === "assistant" && !active ? (
          <footer className="messenger-agent-message-tools">
            {message.durationMs !== null ? <small>{formatDuration(message.durationMs)}</small> : <span />}
            <button aria-label="Copy response" disabled={!message.text} onClick={() => void copy()} title={copied ? "Copied" : "Copy"} type="button">
              {copied ? <Check size={14} /> : <Clipboard size={14} />}
            </button>
            {message.status === "completed" ? (
              <>
                <button aria-label="Helpful response" className={message.feedback === "up" ? "selected" : ""} onClick={() => void onFeedback(message.id, message.feedback === "up" ? null : "up")} title="Helpful" type="button"><ThumbsUp size={14} /></button>
                <button aria-label="Response needs improvement" className={message.feedback === "down" ? "selected" : ""} onClick={() => void onFeedback(message.id, message.feedback === "down" ? null : "down")} title="Needs improvement" type="button"><ThumbsDown size={14} /></button>
              </>
            ) : null}
            {message.status === "failed" || message.status === "cancelled" ? (
              <button aria-label="Retry request" onClick={onRetry} title="Retry" type="button"><RotateCcw size={14} /></button>
            ) : null}
          </footer>
        ) : null}
      </div>
    </article>
  );
}

function ChangedFiles({ files }: { files: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="messenger-agent-files">
      <button aria-expanded={open} onClick={() => setOpen((value) => !value)} type="button"><FileCode2 size={14} /><span>{files.length} changed {files.length === 1 ? "file" : "files"}</span>{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</button>
      {open ? <ul>{files.map((file) => <li key={file}>{file}</li>)}</ul> : null}
    </section>
  );
}

function AgentActivity({ actions }: { actions: AgentMessage["actions"] }) {
  const activeAction = [...actions].reverse().find((action) => action.status === "running");
  const label = activeAction?.label ?? (actions.length ? "Preparing the response" : "Understanding your request");
  return <div className="messenger-agent-activity" role="status"><LoaderCircle className="spin" size={14} /><span>{label}</span><span aria-hidden="true" className="messenger-agent-dots"><i /><i /><i /></span></div>;
}

function ApprovalCard({ approval, onResolve }: { approval: AgentApproval; onResolve: AgentMessageCardProps["onApproval"] }) {
  const [busy, setBusy] = useState(false);
  async function resolve(decision: "accept" | "acceptForSession" | "decline") {
    setBusy(true);
    try { await onResolve(approval, decision); } finally { setBusy(false); }
  }
  return (
    <aside className="messenger-agent-approval" role="alert">
      <ShieldAlert size={18} />
      <div><strong>Approval required</strong><p>{approval.reason}</p></div>
      <footer>
        <button disabled={busy} onClick={() => void resolve("decline")} type="button">Decline</button>
        <button disabled={busy} onClick={() => void resolve("accept")} type="button">Allow once</button>
        <button disabled={busy} onClick={() => void resolve("acceptForSession")} type="button">Allow for session</button>
      </footer>
    </aside>
  );
}

function ActionIcon({ status }: { status: string }) {
  if (status === "completed") return <Check size={13} />;
  if (status === "running") return <LoaderCircle className="spin" size={13} />;
  return <Circle size={13} />;
}

function formatDuration(durationMs: number) {
  if (durationMs < 1000) return `${durationMs} ms`;
  if (durationMs < 60_000) return `${(durationMs / 1000).toFixed(1)} s`;
  return `${Math.floor(durationMs / 60_000)}m ${Math.round((durationMs % 60_000) / 1000)}s`;
}
