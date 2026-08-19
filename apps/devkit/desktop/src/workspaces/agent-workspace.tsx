import {
  Bot,
  Brain,
  Check,
  ChevronDown,
  CircleStop,
  Clock,
  FolderGit2,
  Globe,
  LoaderCircle,
  MessageSquare,
  MessageSquarePlus,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Paperclip,
  Plus,
  Send,
  Server,
  Shield,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  X
} from "lucide-react";
import { lazy, useState, Suspense } from "react";
import type { AgentConfig, AgentProvider, FileEntry, GitChange, Workspace } from "../contracts/desktop";
import type { ResourceState } from "../shell/use-desktop-session";
import { MAX_AGENT_CONTEXT_FILES } from "./agent-context";
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
import { LangGraphVisualizer } from "./langgraph-visualizer";

function formatPath(pathStr: string) {
  if (!pathStr) return "";
  return pathStr.replace(/^\\\\\?\\/, "");
}

const PROVIDER_INFO: Record<string, { name: string; defaultModel: string; icon: React.ReactNode }> = {
  gemini: { name: "Google Gemini", defaultModel: "gemini-2.0-flash", icon: <Sparkles size={16} /> },
  codex: { name: "OpenAI Codex", defaultModel: "gpt-4o", icon: <TerminalSquare size={16} /> },
  openrouter: { name: "OpenRouter Gateway", defaultModel: "deepseek-r1", icon: <Globe size={16} /> },
  claude: { name: "Anthropic Claude", defaultModel: "claude-3.5-sonnet", icon: <Shield size={16} /> },
  ollama: { name: "Ollama Local", defaultModel: "llama3.3:70b", icon: <Server size={16} /> },
  opencode: { name: "OpenCode AI", defaultModel: "opencode-v1", icon: <Brain size={16} /> }
};

function getActiveAgentTitle(config: AgentConfig | null) {
  const provider = config?.defaultProvider || "gemini";
  const info = PROVIDER_INFO[provider] || { name: provider, defaultModel: "default", icon: <Bot size={16} /> };
  const providerCfg = config?.providers?.[provider];
  const model = providerCfg?.model || info.defaultModel;
  return { name: info.name, model, icon: info.icon, provider };
}

const AgentMarkdown = lazy(() =>
  import("./agent-markdown").then((module) => ({ default: module.AgentMarkdown }))
);

export function AgentWorkspace({
  changes,
  changesState,
  contextPaths,
  files,
  filesState,
  onAddContext,
  onClearContext,
  onOpenFile,
  onRefreshChanges,
  onRemoveContext,
  selectedPath,
  workspace
}: {
  changes: GitChange[];
  changesState: ResourceState;
  contextPaths: string[];
  files: FileEntry[];
  filesState: ResourceState;
  onAddContext: (path: string) => void;
  onClearContext: () => void;
  onOpenFile: (path: string) => void;
  onRefreshChanges: () => Promise<void>;
  onRemoveContext: (path: string) => void;
  selectedPath: string | undefined;
  workspace: Workspace;
}) {
  const session = useAgentSession({ contextPaths, onRefreshChanges, workspace });
  const [showProviderMenu, setShowProviderMenu] = useState(false);
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(true);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(true);
  const activeAgent = getActiveAgentTitle(session.agentConfig);

  return (
    <section className={`agent-layout${leftDrawerOpen ? "" : " left-collapsed"}${rightDrawerOpen ? "" : " right-collapsed"}`}>
      {session.error && <AgentErrorBanner message={session.error} />}

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
          <div className="agent-title-dropdown-wrapper">
            <button
              type="button"
              className={`drawer-toggle-btn${leftDrawerOpen ? " active" : ""}`}
              onClick={() => setLeftDrawerOpen(!leftDrawerOpen)}
              title={leftDrawerOpen ? "Collapse Left Drawer (Task History)" : "Expand Left Drawer (Task History)"}
            >
              {leftDrawerOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
            </button>

            <button
              type="button"
              className="agent-title-btn"
              onClick={() => setShowProviderMenu(!showProviderMenu)}
              title="Click to switch AI Agent provider"
            >
              <span className="agent-title-icon">{activeAgent.icon}</span>
              <span className="agent-title-name">
                <strong>{activeAgent.name}</strong> <span className="agent-model-badge">({activeAgent.model})</span>
              </span>
              <ChevronDown size={13} className={`agent-chevron${showProviderMenu ? " open" : ""}`} />
            </button>

            {showProviderMenu && (
              <div className="agent-provider-menu-dropdown">
                <div className="menu-header-label">Switch Active AI Agent</div>
                {Object.entries(PROVIDER_INFO).map(([key, info]) => {
                  const isSelected = key === activeAgent.provider;
                  const currentModel = session.agentConfig?.providers?.[key as AgentProvider]?.model || info.defaultModel;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`provider-menu-item${isSelected ? " active" : ""}`}
                      onClick={() => {
                        session.switchProvider(key as any);
                        setShowProviderMenu(false);
                      }}
                    >
                      <span className="menu-item-icon">{info.icon}</span>
                      <div className="menu-item-info">
                        <span className="menu-item-name">{info.name}</span>
                        <span className="menu-item-model">{currentModel}</span>
                      </div>
                      {isSelected && <Check size={14} className="menu-item-check" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="agent-header-actions">
            <button
              type="button"
              className={`langgraph-toggle-btn${session.langGraphEnabled ? " active" : ""}`}
              onClick={() => session.setLangGraphEnabled(!session.langGraphEnabled)}
              title="Toggle LangGraph Autonomous Node Graph Execution"
            >
              <Sparkles size={13} />
              <span>LangGraph Mode</span>
            </button>

            <small className={`agent-state ${session.running ? "running" : session.runtime === "unavailable" ? "unavailable" : "ready"}`}>
              {session.running ? (
                <>
                  <LoaderCircle size={12} className="spin" /> Agent working
                </>
              ) : session.runtime === "unavailable" ? (
                "Agent unavailable"
              ) : (
                <>
                  <Check size={12} /> Agent ready
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

            {/* LANGGRAPH WORKFLOW VISUALIZER */}
            {session.langGraphState && (
              <LangGraphVisualizer graphState={session.langGraphState} />
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
          {contextPaths.length ? (
            <div className="agent-context-list" aria-label="Attached IDE context">
              {contextPaths.map((path) => (
                <span key={path} title={path}>
                  {fileName(path)}
                  <button
                    aria-label={`Remove ${path} from context`}
                    onClick={() => onRemoveContext(path)}
                    type="button"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          <textarea
            aria-label="Message the coding agent"
            onChange={(event) => session.setComposer(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void session.send();
              }
            }}
            placeholder="Ask DevKit to inspect, build, fix, or review this workspace using LangGraph..."
            rows={3}
            value={session.composer}
          />
          <footer>
            <div className="agent-composer-options">
              <button
                className="attach-context"
                disabled={
                  !selectedPath ||
                  contextPaths.includes(selectedPath) ||
                  contextPaths.length >= MAX_AGENT_CONTEXT_FILES
                }
                onClick={() => selectedPath && onAddContext(selectedPath)}
                title={selectedPath ? `Attach saved file ${selectedPath}` : "Select a file first"}
                type="button"
              >
                <Paperclip size={14} /> Attach file
              </button>
              <select
                aria-label="Agent access level"
                onChange={(event) => session.setAccess(event.target.value as any)}
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

function fileName(path: string) {
  const parts = path.split(/[/\\]/);
  return parts[parts.length - 1] ?? path;
}

function runtimeLabel(status: "connecting" | "idle" | "ready" | "unavailable") {
  if (status === "connecting") return "Starting local agent";
  if (status === "ready") return "Agent ready";
  if (status === "unavailable") return "Agent unavailable";
  return "Agent idle";
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
