import {
  Bot,
  Check,
  ChevronDown,
  CircleStop,
  FolderGit2,
  LoaderCircle,
  MessageSquarePlus,
  Send,
  ShieldCheck,
  X
} from "lucide-react";
import type { FileEntry, GitChange, Workspace } from "../contracts/desktop";
import type { ResourceState } from "../shell/use-desktop-session";
import {
  AgentWelcome,
  ApprovalCard,
  EnvironmentPanel,
  RunTimeline
} from "./agent-workspace-parts";
import "./agent-workspace.css";
import { useAgentSession } from "./use-agent-session";

export function AgentWorkspace({
  changes,
  changesState,
  files,
  filesState,
  onOpenFile,
  onRefreshChanges,
  workspace
}: {
  changes: GitChange[];
  changesState: ResourceState;
  files: FileEntry[];
  filesState: ResourceState;
  onOpenFile: (path: string) => void;
  onRefreshChanges: () => Promise<void>;
  workspace: Workspace;
}) {
  const session = useAgentSession({ onRefreshChanges, workspace });
  return (
    <section className="agent-workspace">
      <aside className="agent-history">
        <button
          className="new-agent-chat"
          disabled={session.running}
          onClick={() => void session.newChat()}
          type="button"
        >
          <MessageSquarePlus size={16} /> New task
        </button>
        <div className="agent-project">
          <span>
            <FolderGit2 size={15} /> Project
          </span>
          <strong>{workspace.name}</strong>
          <small>{workspace.path}</small>
        </div>
        <div className="history-heading">Recent tasks</div>
        {session.tasks.length ? (
          session.tasks.map((task) => (
            <button
              className={`history-row${session.activeTaskId === task.id ? " active" : ""}`}
              disabled={session.running && session.activeTaskId !== task.id}
              key={task.id}
              onClick={() => void session.openTask(task)}
              type="button"
            >
              <span>{task.title}</span>
              <small>
                {session.activeTaskId === task.id && session.running
                  ? "Agent working"
                  : relativeTime(task.updatedAt)}
              </small>
            </button>
          ))
        ) : (
          <p className="history-empty">Your saved coding tasks will appear here.</p>
        )}
      </aside>

      <div className="agent-chat">
        <header className="agent-chat-header">
          <span>
            <Bot size={17} /> Coding agent
          </span>
          <small className={`agent-state ${session.runtime}`}>
            {session.runtime === "ready" ? <Check size={12} /> : <LoaderCircle size={12} />}
            {session.runtime === "ready" ? "Codex connected" : session.runtime}
          </small>
        </header>
        <div className="agent-transcript" ref={session.transcript}>
          {session.messages.length === 0 ? (
            <AgentWelcome workspace={workspace} onPrompt={session.setComposer} />
          ) : (
            session.messages.map((message) => (
              <article className={`agent-message ${message.role}`} key={message.id}>
                <span>{message.role === "agent" ? <Bot size={15} /> : "You"}</span>
                <p>{message.text}</p>
              </article>
            ))
          )}
          {session.runItems.length ? <RunTimeline items={session.runItems} /> : null}
          {session.approval ? (
            <ApprovalCard approval={session.approval} onDecide={session.decide} />
          ) : null}
          {session.error ? (
            <div className="agent-error">
              <X size={14} /> {session.error}
            </div>
          ) : null}
        </div>
        <div className="agent-composer">
          <textarea
            aria-label="Message the coding agent"
            onChange={(event) => session.setComposer(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void session.send();
              }
            }}
            placeholder="Ask CodeLogix to inspect, build, fix, or review this workspace"
            rows={3}
            value={session.composer}
          />
          <footer>
            <label>
              <ShieldCheck size={14} />
              <select
                value={session.access}
                onChange={(event) =>
                  session.setAccess(event.target.value as "readOnly" | "workspaceWrite")
                }
              >
                <option value="workspaceWrite">Workspace access</option>
                <option value="readOnly">Read only</option>
              </select>
              <ChevronDown size={13} />
            </label>
            {session.running && session.threadId && session.turnId ? (
              <button className="stop-agent" onClick={() => void session.interrupt()} type="button">
                <CircleStop size={16} />
              </button>
            ) : (
              <button
                disabled={!session.composer.trim() || !session.threadId}
                onClick={() => void session.send()}
                type="button"
              >
                <Send size={16} />
              </button>
            )}
          </footer>
        </div>
      </div>

      <EnvironmentPanel
        changes={changes}
        changesState={changesState}
        diff={session.diff}
        files={files}
        filesState={filesState}
        onOpenFile={onOpenFile}
        workspace={workspace}
      />
    </section>
  );
}

function relativeTime(value: string) {
  const date = new Date(`${value.replace(" ", "T")}Z`);
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
