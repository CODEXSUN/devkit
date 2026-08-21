import {
  Bot,
  CircleStop,
  Clock,
  FolderGit2,
  LoaderCircle,
  MessageSquare,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Send,
} from "lucide-react";
import { lazy, Suspense, useState } from "react";
import type { AgentAccess, FileEntry, GitChange, Workspace } from "../contracts/desktop";
import type { ResourceState } from "../shell/use-desktop-session";
import { AgentErrorBanner } from "./agent-error-banner";
import { AgentMessageActions } from "./agent-message-actions";
import { ConversationRail } from "./conversation-rail";
import {
  AgentWelcome,
  ApprovalCard,
  EnvironmentPanel,
  RunTimeline
} from "./agent-workspace-parts";
import "./agent-workspace.css";
import { useAgentSession } from "./use-agent-session";

function formatPath(pathStr: string) {
  if (!pathStr) return "";
  return pathStr.replace(/^\\\\\?\\/, "");
}

const AgentMarkdown = lazy(() =>
  import("./agent-markdown").then((module) => ({ default: module.AgentMarkdown }))
);

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
  const session = useAgentSession({ onRefreshChanges });
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(true);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(true);
  return (
    <section className={`agent-layout${leftDrawerOpen ? "" : " left-collapsed"}${rightDrawerOpen ? "" : " right-collapsed"}`}>
      <aside className={`agent-history${leftDrawerOpen ? "" : " collapsed"}`}>
        <div className="history-header">
          <button type="button" className="history-new-btn" onClick={session.newChat}>
            <Plus size={16} /> New task
          </button>
        </div>

        <div className="history-project-card">
          <div className="project-card-header">
            <FolderGit2 size={13} className="project-icon" />
            <span>ACTIVE WORKSPACE</span>
          </div>
          <div className="project-name">{workspace.name}</div>
          <div className="project-path" title={formatPath(workspace.path)}>
            {formatPath(workspace.path)}
          </div>
        </div>

        <div className="history-divider" />

        <div className="history-section-header">
          <Clock size={12} />
          <span>RECENT TASKS</span>
        </div>

        <div className="history-list">
          {session.tasks.length > 0 ? (
            session.tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                className={`history-item${session.activeTaskId === task.id ? " active" : ""}`}
                onClick={() => session.openTask(task)}
              >
                <div className="history-item-top">
                  <MessageSquare size={13} className="history-item-icon" />
                  <span className="history-item-title">{task.title}</span>
                </div>
                <div className="history-item-meta">
                  <span className="history-item-time">{relativeTime(task.updatedAt)}</span>
                  {session.activeTaskId === task.id && session.running && (
                    <span className="history-status-badge">
                      <LoaderCircle size={10} className="spin" /> Working
                    </span>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="history-empty-state">
              <MessageSquarePlus size={20} className="empty-icon" />
              <span>No recent tasks</span>
              <p>Click <strong>New task</strong> above to start a conversation with the agent.</p>
            </div>
          )}
        </div>
      </aside>

      <div className="agent-chat">
        <header className="agent-chat-header">
          <div className="agent-title-wrapper">
            <button
              type="button"
              className={`drawer-toggle-btn${leftDrawerOpen ? " active" : ""}`}
              onClick={() => setLeftDrawerOpen(!leftDrawerOpen)}
              title={leftDrawerOpen ? "Collapse Left Drawer (Task History)" : "Expand Left Drawer (Task History)"}
            >
              {leftDrawerOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
            </button>

            <div className="agent-title" title="Transparent Codex App Server client">
              <Bot size={16} />
              <span><strong>Codex</strong><small>DevKit coding workspace</small></span>
            </div>
          </div>

          <div className="agent-header-actions">
            <small className={`agent-state ${session.running ? "running" : session.runtime === "unavailable" ? "unavailable" : "ready"}`}>
              {session.running ? (
                <>
                  <LoaderCircle size={12} className="spin" /> Agent working
                </>
              ) : session.runtime === "unavailable" ? (
                "Agent unavailable"
              ) : (
                <>
                  <>Codex ready</>
                </>
              )}
            </small>

            <button
              type="button"
              className={`drawer-toggle-btn${rightDrawerOpen ? " active" : ""}`}
              onClick={() => setRightDrawerOpen(!rightDrawerOpen)}
              title={rightDrawerOpen ? "Collapse Right Drawer (Environment & Changes)" : "Expand Right Drawer (Environment & Changes)"}
            >
              {rightDrawerOpen ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
            </button>
          </div>
        </header>

        <div className="agent-transcript-shell">
          <ConversationRail messages={session.messages} transcript={session.transcript} />
          <div className="agent-transcript" ref={session.transcript}>
            {session.messages.length === 0 ? (
              <AgentWelcome workspace={workspace} onPrompt={session.setComposer} />
            ) : (
              session.messages.map((message) => (
                <article
                  className={`agent-message ${message.role}`}
                  data-message-id={message.id}
                  key={message.id}
                >
                  <span>{message.role === "agent" ? <Bot size={15} /> : "You"}</span>
                  {message.role === "agent" ? (
                    <Suspense fallback={<p>{message.text}</p>}>
                      <AgentMarkdown text={message.text} />
                    </Suspense>
                  ) : (
                    <p>{message.text}</p>
                  )}
                  <AgentMessageActions createdAt={message.createdAt} text={message.text} />
                </article>
              ))
            )}

            {session.runItems.length ? <RunTimeline items={session.runItems} /> : null}
            {session.approval ? (
              <ApprovalCard approval={session.approval} onDecide={session.answerApproval} />
            ) : null}
            {session.stalled ? (
              <div className="agent-stalled">
                <LoaderCircle size={14} /> No agent activity for one minute. You can wait or stop
                this turn.
              </div>
            ) : null}
            {session.error ? (
              <AgentErrorBanner message={session.error} />
            ) : null}
          </div>
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
            placeholder="Ask Codex to inspect, build, fix, or review this workspace..."
            rows={3}
            value={session.composer}
          />
          <footer>
            <div className="agent-composer-options">
              <select
                aria-label="Agent access level"
                onChange={(event) => session.setAccess(event.target.value as AgentAccess)}
                value={session.access}
              >
                <option value="workspaceWrite">Workspace Write</option>
                <option value="readOnly">Read Only</option>
              </select>
            </div>
            <div className="agent-composer-actions">
              {session.running ? (
                <button
                  className="interrupt-turn"
                  onClick={() => void session.interrupt()}
                  type="button"
                >
                  <CircleStop size={14} /> Stop
                </button>
              ) : null}
              <button
                className="send-turn"
                disabled={!session.composer.trim() || session.busy}
                onClick={() => void session.send()}
                type="button"
              >
                <Send size={14} />
              </button>
            </div>
          </footer>
        </div>
      </div>

      <div className={`agent-environment-container${rightDrawerOpen ? "" : " collapsed"}`}>
        <EnvironmentPanel
          changes={changes}
          changesState={changesState}
          diff={session.diff}
          files={files}
          filesState={filesState}
          onOpenFile={onOpenFile}
          workspace={workspace}
        />
      </div>
    </section>
  );
}

function relativeTime(dateString: string) {
  const diffMs = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
