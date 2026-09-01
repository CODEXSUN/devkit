import {
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  Clipboard,
  Blocks,
  LoaderCircle,
  FileCode2,
  Lightbulb,
  ListTodo,
  Share2,
  StickyNote,
  ThumbsDown,
  ThumbsUp,
  RotateCcw,
  ShieldAlert,
  X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { AgentApproval, AgentMessage } from "./agent-chat-events";
import { AgentMarkdown } from "./AgentMarkdown";
import { AgentStructuredPlanCard } from "./AgentStructuredPlanCard";

type AgentMessageCardProps = {
  active: boolean;
  evidenceExpanded: boolean;
  message: AgentMessage;
  onApproval: (
    approval: AgentApproval,
    decision: "accept" | "acceptForSession" | "decline"
  ) => Promise<void>;
  onFeedback: (messageId: string, feedback: "down" | "up" | null) => Promise<void>;
  onCreateTasks?:
    ((tasks: string[], acceptance: string[], tests: string[]) => Promise<boolean>) | undefined;
  creatingTasks?: boolean | undefined;
  onRetry: () => void;
  onShare?: ((input: AgentShareInput) => Promise<boolean>) | undefined;
  sharing?: boolean | undefined;
};

export type AgentShareTarget = "idea" | "module" | "note" | "task";
export type AgentShareInput = { content: string; target: AgentShareTarget; title: string };

export function AgentMessageCard({
  active,
  evidenceExpanded,
  message,
  onApproval,
  onCreateTasks,
  creatingTasks = false,
  onFeedback,
  onRetry,
  onShare,
  sharing = false
}: AgentMessageCardProps) {
  const [actionsOpen, setActionsOpen] = useState(active);
  const showActions = active || evidenceExpanded || actionsOpen;
  const [copied, setCopied] = useState(false);
  const [shareTarget, setShareTarget] = useState<AgentShareTarget>();
  const failedActions = message.actions.filter((action) => action.status === "failed").length;
  const completedActions = message.actions.filter((action) => action.status === "completed").length;

  async function copy() {
    await navigator.clipboard.writeText(message.text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <article className={`messenger-agent-message ${message.role}${active ? " streaming" : ""}`}>
      {message.role === "assistant" ? (
        <span className="messenger-agent-avatar">
          <Bot size={16} />
        </span>
      ) : null}
      <div>
        {message.actions.length ? (
          <section className="messenger-agent-evidence">
            <button
              aria-expanded={showActions}
              onClick={() => setActionsOpen((open) => !open)}
              type="button"
            >
              <span>
                {active ? "Working" : `${completedActions} actions`}
                {failedActions ? ` · ${failedActions} failed` : ""}
              </span>
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
        {message.approval ? (
          <ApprovalCard approval={message.approval} onResolve={onApproval} />
        ) : null}
        {active && !message.text ? (
          <AgentActivity actions={message.actions} />
        ) : (
          <AgentMarkdown streaming={active} text={message.text} />
        )}
        {message.role === "assistant" && !active && onCreateTasks ? (
          <AgentStructuredPlanCard
            busy={creatingTasks}
            onCreateTasks={onCreateTasks}
            text={message.text}
          />
        ) : null}
        {message.files.length ? <ChangedFiles files={message.files} /> : null}
        {message.role === "assistant" && !active ? (
          <footer className="messenger-agent-message-tools">
            {message.durationMs !== null ? (
              <small>{formatDuration(message.durationMs)}</small>
            ) : (
              <span />
            )}
            <button
              aria-label="Copy response"
              disabled={!message.text}
              onClick={() => void copy()}
              title={copied ? "Copied" : "Copy"}
              type="button"
            >
              {copied ? <Check size={14} /> : <Clipboard size={14} />}
            </button>
            {message.status === "completed" && onShare ? (
              <ShareMessageMenu disabled={!message.text || sharing} onSelect={setShareTarget} />
            ) : null}
            {message.status === "completed" ? (
              <>
                <button
                  aria-label="Helpful response"
                  className={message.feedback === "up" ? "selected" : ""}
                  onClick={() =>
                    void onFeedback(message.id, message.feedback === "up" ? null : "up")
                  }
                  title="Helpful"
                  type="button"
                >
                  <ThumbsUp size={14} />
                </button>
                <button
                  aria-label="Response needs improvement"
                  className={message.feedback === "down" ? "selected" : ""}
                  onClick={() =>
                    void onFeedback(message.id, message.feedback === "down" ? null : "down")
                  }
                  title="Needs improvement"
                  type="button"
                >
                  <ThumbsDown size={14} />
                </button>
              </>
            ) : null}
            {message.status === "failed" || message.status === "cancelled" ? (
              <button aria-label="Retry request" onClick={onRetry} title="Retry" type="button">
                <RotateCcw size={14} />
              </button>
            ) : null}
          </footer>
        ) : null}
      </div>
      {shareTarget && onShare ? (
        <AgentShareDialog
          key={shareTarget}
          message={message}
          onClose={() => setShareTarget(undefined)}
          onCreate={async (input) => {
            const created = await onShare(input);
            if (created) setShareTarget(undefined);
            return created;
          }}
          saving={sharing}
          target={shareTarget}
        />
      ) : null}
    </article>
  );
}

function ShareMessageMenu({
  disabled,
  onSelect
}: {
  disabled: boolean;
  onSelect: (target: AgentShareTarget) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent | PointerEvent) => {
      if (event instanceof KeyboardEvent) {
        if (event.key === "Escape") setOpen(false);
        return;
      }
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", close);
    window.addEventListener("pointerdown", close);
    return () => {
      window.removeEventListener("keydown", close);
      window.removeEventListener("pointerdown", close);
    };
  }, [open]);

  return (
    <div className="agent-share-menu" ref={menuRef}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Save response to workspace"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        title="Save to…"
        type="button"
      >
        <Share2 size={14} />
      </button>
      {open ? (
        <div role="menu">
          <button
            onClick={() => {
              onSelect("idea");
              setOpen(false);
            }}
            role="menuitem"
            type="button"
          >
            <Lightbulb size={14} /> Idea
          </button>
          <button
            onClick={() => {
              onSelect("note");
              setOpen(false);
            }}
            role="menuitem"
            type="button"
          >
            <StickyNote size={14} /> Note
          </button>
          <button
            onClick={() => {
              onSelect("module");
              setOpen(false);
            }}
            role="menuitem"
            type="button"
          >
            <Blocks size={14} /> Module proposal
          </button>
          <button
            onClick={() => {
              onSelect("task");
              setOpen(false);
            }}
            role="menuitem"
            type="button"
          >
            <ListTodo size={14} /> Task
          </button>
        </div>
      ) : null}
    </div>
  );
}

function AgentShareDialog({
  message,
  onClose,
  onCreate,
  saving,
  target
}: {
  message: AgentMessage;
  onClose: () => void;
  onCreate: (input: AgentShareInput) => Promise<boolean>;
  saving: boolean;
  target: AgentShareTarget;
}) {
  const [destination, setDestination] = useState<AgentShareTarget>(target);
  const [title, setTitle] = useState(responseTitle(message.text));
  const [content, setContent] = useState(message.text);
  return (
    <div className="agent-share-backdrop" role="presentation">
      <form
        aria-labelledby="agent-share-title"
        aria-modal="true"
        className="agent-share-dialog"
        onSubmit={(event) => {
          event.preventDefault();
          if (title.trim() && content.trim() && !saving)
            void onCreate({ content: content.trim(), target: destination, title: title.trim() });
        }}
        role="dialog"
      >
        <header>
          <div>
            <small>AGENT ACTION</small>
            <h2 id="agent-share-title">Create from response</h2>
            <p>Review the writing before it becomes project work.</p>
          </div>
          <button aria-label="Close create action" onClick={onClose} type="button">
            <X size={17} />
          </button>
        </header>
        <label>
          <span>Destination</span>
          <select
            onChange={(event) => setDestination(event.target.value as AgentShareTarget)}
            value={destination}
          >
            <option value="idea">Ideas</option>
            <option value="note">Notes</option>
            <option value="module">Module proposals</option>
            <option value="task">Tasks</option>
          </select>
        </label>
        <label>
          <span>Title</span>
          <input autoFocus onChange={(event) => setTitle(event.target.value)} value={title} />
        </label>
        <label>
          <span>Content</span>
          <textarea onChange={(event) => setContent(event.target.value)} rows={9} value={content} />
        </label>
        <footer>
          <button onClick={onClose} type="button">
            Cancel
          </button>
          <button disabled={saving || !title.trim() || !content.trim()} type="submit">
            {saving ? "Creating…" : `Create ${shareTargetLabel(destination)}`}
          </button>
        </footer>
      </form>
    </div>
  );
}

function ChangedFiles({ files }: { files: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="messenger-agent-files">
      <button aria-expanded={open} onClick={() => setOpen((value) => !value)} type="button">
        <FileCode2 size={14} />
        <span>
          {files.length} changed {files.length === 1 ? "file" : "files"}
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open ? (
        <ul>
          {files.map((file) => (
            <li key={file}>{file}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function AgentActivity({ actions }: { actions: AgentMessage["actions"] }) {
  const activeAction = [...actions].reverse().find((action) => action.status === "running");
  const label =
    activeAction?.label ??
    (actions.length ? "Preparing the response" : "Understanding your request");
  return (
    <div className="messenger-agent-activity" role="status">
      <LoaderCircle className="messenger-agent-loader" size={14} />
      <span>{label}</span>
      <span aria-hidden="true" className="messenger-agent-dots">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

function ApprovalCard({
  approval,
  onResolve
}: {
  approval: AgentApproval;
  onResolve: AgentMessageCardProps["onApproval"];
}) {
  const [busy, setBusy] = useState(false);
  async function resolve(decision: "accept" | "acceptForSession" | "decline") {
    setBusy(true);
    try {
      await onResolve(approval, decision);
    } finally {
      setBusy(false);
    }
  }
  return (
    <aside className="messenger-agent-approval" role="alert">
      <ShieldAlert size={18} />
      <div>
        <strong>Approval required</strong>
        <p>{approval.reason}</p>
      </div>
      <footer>
        <button disabled={busy} onClick={() => void resolve("decline")} type="button">
          Decline
        </button>
        <button disabled={busy} onClick={() => void resolve("accept")} type="button">
          Allow once
        </button>
        <button disabled={busy} onClick={() => void resolve("acceptForSession")} type="button">
          Allow for session
        </button>
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

function responseTitle(text: string) {
  const firstLine = text
    .split("\n")
    .find((line) => line.trim())
    ?.replace(/^#+\s*/u, "")
    .trim();
  return firstLine?.slice(0, 120) || "Agent response";
}

function shareTargetLabel(target: AgentShareTarget) {
  if (target === "module") return "module proposal";
  return target;
}
