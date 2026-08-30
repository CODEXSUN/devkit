import {
  Archive,
  Bot,
  ChevronDown,
  FolderPlus,
  GitBranch,
  Menu,
  MessageCircle,
  PanelRightClose,
  PanelRightOpen,
  Pin,
  PinOff,
  Search,
  SendHorizontal,
  Users,
  Plus
} from "lucide-react";
import { io, type Socket } from "socket.io-client";
import {
  FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { WorkspaceDrawerHeader } from "./WorkspaceDrawerHeader";
import { AgentChatWorkspace } from "./AgentChatWorkspace";
import { ArchivedChatsPage } from "./ArchivedChatsPage";
import { CoworkerClient } from "./client";
import type { CoworkerChat, CoworkerProject } from "./types";

export { MessengerConnectionPanel } from "./MessengerConnectionPanel";
export type { MessengerConnectionState } from "./MessengerConnectionPanel";

export type MessengerClientKind = "desktop" | "mobile" | "web";
type WorkspaceSpace = "agent" | "archives" | "messenger" | "projects";
type Message = {
  actorId: string;
  body: string;
  client: MessengerClientKind;
  createdAt: string;
  uuid: string;
};
type Envelope<T> = { data: T; success: true } | { error: { message: string }; success: false };
type MessengerProps = {
  apiUrl: string;
  clientKind: MessengerClientKind;
  conversationName?: string;
  drawerCollapsed?: boolean;
  logoSrc?: string;
  onConnectionStateChange?: (
    state: import("./MessengerConnectionPanel").MessengerConnectionState
  ) => void;
  onDrawerCollapsedChange?: (collapsed: boolean) => void;
  onOpenAi: () => void;
  onToggleSidePanel?: () => void;
  product?: string;
  sidePanel?: ReactNode;
  sidePanelOpen?: boolean;
  token: string;
  workspaceName?: string;
};

export function MessengerChat({
  apiUrl,
  clientKind,
  conversationName = "My Devices",
  drawerCollapsed = false,
  logoSrc,
  onConnectionStateChange,
  onDrawerCollapsedChange,
  onOpenAi,
  onToggleSidePanel,
  product = "DevKit",
  sidePanel,
  sidePanelOpen = false,
  token,
  workspaceName = "DevKit product roadmap"
}: MessengerProps) {
  const baseUrl = apiUrl.replace(/\/+$/u, "");
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState("");
  const [activeSpace, setActiveSpace] = useState<WorkspaceSpace>("messenger");
  const [connected, setConnected] = useState(false);
  const [drawerQuery, setDrawerQuery] = useState("");
  const [agentChats, setAgentChats] = useState<CoworkerChat[]>([]);
  const [archivedAgentChats, setArchivedAgentChats] = useState<CoworkerChat[]>([]);
  const [agentProjects, setAgentProjects] = useState<CoworkerProject[]>([]);
  const [agentProjectId, setAgentProjectId] = useState<string | null>(null);
  const [agentConversationId, setAgentConversationId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }),
    [token]
  );
  const agentClient = useMemo(() => new CoworkerClient(baseUrl, () => token), [baseUrl, token]);
  const refreshAgentNavigation = useCallback(async () => {
    const [chats, projects] = await Promise.allSettled([
      agentClient.chats(),
      agentClient.projects()
    ]);
    if (chats.status === "fulfilled") setAgentChats(chats.value);
    if (projects.status === "fulfilled") setAgentProjects(projects.value);
    if (chats.status === "rejected" && projects.status === "rejected") throw projects.reason;
  }, [agentClient]);
  const refreshArchivedChats = useCallback(async () => {
    setArchivedAgentChats(await agentClient.archivedChats());
  }, [agentClient]);
  const archiveAgentChat = useCallback(
    async (conversationId: string) => {
      await agentClient.archiveChat(conversationId);
      if (agentConversationId === conversationId) setAgentConversationId(null);
      await refreshAgentNavigation();
    },
    [agentClient, agentConversationId, refreshAgentNavigation]
  );
  const setAgentChatPinned = useCallback(
    async (conversationId: string, pinned: boolean) => {
      await agentClient.setChatPinned(conversationId, pinned);
      await refreshAgentNavigation();
    },
    [agentClient, refreshAgentNavigation]
  );
  const connectionState = connected
    ? "connected"
    : error
      ? "error"
      : syncing
        ? "connecting"
        : "offline";
  const refreshMessages = useCallback(async () => {
    setSyncing(true);
    try {
      const latest = await request<Message[]>(baseUrl, "/api/devkit/messenger/messages", headers);
      setMessages((current) => reconcileMessages(current, latest));
      setError("");
    } catch (reason) {
      setError(messageFrom(reason));
    } finally {
      setSyncing(false);
    }
  }, [baseUrl, headers]);

  useEffect(() => {
    void refreshMessages();
    const socket: Socket = io(baseUrl, {
      auth: { token: `Bearer ${token}` },
      path: "/api/devkit/messenger/socket.io",
      transports: ["websocket", "polling"],
      tryAllTransports: true
    });
    socket.on("connect", () => setConnected(true));
    socket.on("connect_error", () => {
      setConnected(false);
      setError("Live connection is retrying. Messages will continue to refresh.");
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("messenger.message", (message: Message) =>
      setMessages((current) => mergeMessage(current, message))
    );
    const interval = window.setInterval(() => void refreshMessages(), 10_000);
    return () => {
      window.clearInterval(interval);
      socket.disconnect();
    };
  }, [baseUrl, refreshMessages, token]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    onConnectionStateChange?.(connectionState);
  }, [connectionState, onConnectionStateChange]);

  useEffect(() => {
    if (activeSpace === "messenger") composerRef.current?.focus();
  }, [activeSpace]);

  useEffect(() => {
    if (activeSpace !== "agent" && activeSpace !== "archives" && activeSpace !== "projects") return;
    const refresh = activeSpace === "archives"
      ? Promise.all([refreshAgentNavigation(), refreshArchivedChats()])
      : refreshAgentNavigation();
    void refresh.catch((reason) => setError(messageFrom(reason)));
  }, [activeSpace, refreshAgentNavigation, refreshArchivedChats]);

  useEffect(() => {
    if (!onDrawerCollapsedChange) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        onDrawerCollapsedChange(!drawerCollapsed);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [drawerCollapsed, onDrawerCollapsedChange]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const message = await request<Message>(baseUrl, "/api/devkit/messenger/messages", headers, {
        body: JSON.stringify({ body: text, client: clientKind }),
        method: "POST"
      });
      setMessages((current) => mergeMessage(current, message));
      setBody("");
      setError("");
    } catch (reason) {
      setError(messageFrom(reason));
    } finally {
      setSending(false);
      composerRef.current?.focus();
    }
  }

  return (
    <main
      className={`messenger-shell${drawerCollapsed ? " drawer-collapsed" : ""}${sidePanel ? " has-side-panel" : ""}${sidePanelOpen ? " side-panel-open" : ""}`}
    >
      <MessengerActivityBar
        activeSpace={activeSpace}
        collapsed={drawerCollapsed}
        onCollapsedChange={onDrawerCollapsedChange}
        onOpenAgent={() => setActiveSpace("agent")}
        onOpenMessenger={() => {
          setActiveSpace("messenger");
          onOpenAi();
        }}
        onOpenProjects={() => setActiveSpace("projects")}
      />
      <MessengerDevelopmentDrawer
        activeAgentConversationId={agentConversationId}
        activeSpace={activeSpace}
        agentChats={agentChats}
        archivedChatCount={archivedAgentChats.length}
        agentProjects={agentProjects}
        collapsed={drawerCollapsed}
        conversationName={conversationName}
        logoSrc={logoSrc}
        onCollapsedChange={onDrawerCollapsedChange}
        product={product}
        query={drawerQuery}
        onQueryChange={setDrawerQuery}
        onNewAgentChat={() => {
          setAgentConversationId(null);
          setActiveSpace("agent");
        }}
        onOpenArchived={() => setActiveSpace("archives")}
        onArchiveAgentChat={(conversationId) =>
          void archiveAgentChat(conversationId).catch((reason) => setError(messageFrom(reason)))
        }
        onOpenAgentChat={setAgentConversationId}
        onSetAgentChatPinned={(conversationId, pinned) =>
          void setAgentChatPinned(conversationId, pinned).catch((reason) =>
            setError(messageFrom(reason))
          )
        }
        onOpenProject={(project) => {
          setAgentProjectId(project.id);
          setAgentConversationId(null);
          setActiveSpace("agent");
        }}
      />
      <section className="messenger-workspace">
        <header className="messenger-header">
          <div className="messenger-context">
            <button className="messenger-project" type="button">
              {activeSpace === "messenger" ? conversationName : workspaceName}
              <ChevronDown size={15} />
            </button>
            <span
              className={
                connected || activeSpace === "agent" || activeSpace === "archives"
                  ? "messenger-status active"
                  : "messenger-status"
              }
            >
              <i />
              {activeSpace === "agent"
                ? "Codex"
                : activeSpace === "archives"
                  ? "Archive"
                : connected
                  ? "Ready"
                  : syncing
                    ? "Syncing"
                    : "Offline"}
            </span>
          </div>
        </header>
        {activeSpace === "archives" ? (
          <ArchivedChatsPage
            chats={archivedAgentChats}
            onDelete={async (chat) => {
              await agentClient.forceDeleteChat(chat.uuid);
              await refreshArchivedChats();
            }}
            onDeleteAll={async () => {
              await agentClient.forceDeleteArchivedChats();
              await refreshArchivedChats();
            }}
            onRestore={async (chat) => {
              await agentClient.restoreChat(chat.uuid);
              await Promise.all([refreshAgentNavigation(), refreshArchivedChats()]);
            }}
            projects={agentProjects}
          />
        ) : activeSpace === "agent" ? (
          <AgentChatWorkspace
            apiUrl={baseUrl}
            connected={connected}
            onConversationChange={(conversationId) => {
              setAgentConversationId(conversationId);
              void refreshAgentNavigation();
            }}
            selectedConversationId={agentConversationId}
            selectedProjectId={agentProjectId}
            token={token}
          />
        ) : activeSpace === "projects" ? (
          <ProjectSpace
            onOpen={(project) => {
              setAgentProjectId(project.id);
              setAgentConversationId(null);
              setActiveSpace("agent");
            }}
            projects={agentProjects}
          />
        ) : (
          <>
            <section className="messenger-thread" aria-live="polite">
              {messages.length ? (
                messages.map((message) => (
                  <article
                    className={`messenger-message${message.client === clientKind ? " own" : ""}`}
                    key={message.uuid}
                  >
                    {message.client !== clientKind ? (
                      <span className="messenger-avatar">
                        <Users size={15} />
                      </span>
                    ) : null}
                    <div>
                      <small>{label(message.client)}</small>
                      <p>{message.body}</p>
                      <time>
                        {new Date(message.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </time>
                    </div>
                  </article>
                ))
              ) : (
                <div className="messenger-empty">
                  <Users size={24} />
                  <h1>Your shared chat</h1>
                  <p>Messages appear instantly on web, desktop, and mobile.</p>
                </div>
              )}
              <div ref={endRef} />
            </section>
            {error ? (
              <p className="messenger-feedback" role="status">
                {error}
                <button disabled={syncing} onClick={() => void refreshMessages()} type="button">
                  {syncing ? "Refreshing…" : "Refresh"}
                </button>
              </p>
            ) : null}
            <form className="messenger-composer" onSubmit={send}>
              <textarea
                aria-label="Message your devices"
                disabled={sending}
                onChange={(event) => setBody(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Message web, desktop, and mobile"
                ref={composerRef}
                rows={2}
                value={body}
              />
              <footer>
                <button onClick={() => composerRef.current?.focus()} type="button">
                  <MessageCircle size={17} />
                </button>
                <button disabled={!body.trim() || sending} type="submit">
                  <SendHorizontal size={17} />
                </button>
              </footer>
            </form>
          </>
        )}
      </section>
      {sidePanel ? <aside className="messenger-side-panel">{sidePanel}</aside> : null}
      {sidePanel && onToggleSidePanel ? (
        <MessengerRightActivityBar open={sidePanelOpen} onToggle={onToggleSidePanel} />
      ) : null}
    </main>
  );
}

function MessengerActivityBar({
  activeSpace,
  collapsed,
  onCollapsedChange,
  onOpenAgent,
  onOpenMessenger,
  onOpenProjects
}: {
  activeSpace: WorkspaceSpace;
  collapsed: boolean;
  onCollapsedChange?: ((collapsed: boolean) => void) | undefined;
  onOpenAgent: () => void;
  onOpenMessenger: () => void;
  onOpenProjects: () => void;
}) {
  return (
    <nav className="messenger-activity" aria-label="Development tools">
      <div className="activity-header">
        <button
          aria-label={collapsed ? "Open sidebar" : "Collapse sidebar"}
          onClick={() => onCollapsedChange?.(!collapsed)}
          title={`${collapsed ? "Open" : "Collapse"} sidebar (Ctrl+B)`}
          type="button"
        >
          <Menu size={20} />
        </button>
      </div>
      <button
        aria-current={activeSpace === "messenger" ? "page" : undefined}
        aria-label="Messenger"
        onClick={onOpenMessenger}
        title="Messenger"
        type="button"
      >
        <MessageCircle size={18} />
      </button>
      <button
        aria-current={activeSpace === "agent" || activeSpace === "archives" ? "page" : undefined}
        aria-label="Agent"
        onClick={onOpenAgent}
        title="Agent"
        type="button"
      >
        <Bot size={18} />
      </button>
      <button
        aria-current={activeSpace === "projects" ? "page" : undefined}
        aria-label="Projects"
        onClick={onOpenProjects}
        title="Projects"
        type="button"
      >
        <FolderPlus size={18} />
      </button>
    </nav>
  );
}

function ProjectSpace({
  onOpen,
  projects
}: {
  onOpen: (project: CoworkerProject) => void;
  projects: CoworkerProject[];
}) {
  return (
    <section className="messenger-project-space">
      <header>
        <div>
          <h1>Projects</h1>
          <p>Connected repository workspaces available on mobile, desktop, and web.</p>
        </div>
        <strong>{projects.length} connected</strong>
      </header>
      <div className="messenger-project-grid">
        {projects.map((project) => (
          <button key={project.id} onClick={() => onOpen(project)} type="button">
            <span className="messenger-project-icon"><FolderPlus size={18} /></span>
            <span className="messenger-project-copy">
              <strong>{project.title}</strong>
              <small>{plainText(project.description) || "Connected development workspace"}</small>
              <span className="messenger-project-meta">
                <span><GitBranch size={13} /> {project.repositoryName || project.key}</span>
                <span>{project.status || "Active"}</span>
              </span>
            </span>
          </button>
        ))}
        {!projects.length ? <p>No connected projects are available.</p> : null}
      </div>
    </section>
  );
}

function MessengerRightActivityBar({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <nav className="messenger-right-activity" aria-label="Workspace panels">
      <button
        aria-current={open ? "page" : undefined}
        aria-label={open ? "Hide Agent panel" : "Show Agent panel"}
        onClick={onToggle}
        title={open ? "Hide Agent panel" : "Show Agent panel"}
        type="button"
      >
        {open ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
      </button>
    </nav>
  );
}

function MessengerDevelopmentDrawer({
  activeAgentConversationId,
  activeSpace,
  agentChats,
  archivedChatCount,
  agentProjects,
  collapsed,
  conversationName,
  logoSrc,
  onCollapsedChange,
  onArchiveAgentChat,
  onNewAgentChat,
  onOpenArchived,
  onOpenAgentChat,
  onOpenProject,
  onSetAgentChatPinned,
  onQueryChange,
  product,
  query
}: {
  activeAgentConversationId: string | null;
  activeSpace: WorkspaceSpace;
  agentChats: CoworkerChat[];
  archivedChatCount: number;
  agentProjects: CoworkerProject[];
  collapsed: boolean;
  conversationName: string;
  logoSrc?: string | undefined;
  onCollapsedChange?: ((collapsed: boolean) => void) | undefined;
  onArchiveAgentChat: (conversationId: string) => void;
  onNewAgentChat: () => void;
  onOpenArchived: () => void;
  onOpenAgentChat: (conversationId: string) => void;
  onOpenProject: (project: CoworkerProject) => void;
  onSetAgentChatPinned: (conversationId: string, pinned: boolean) => void;
  onQueryChange: (query: string) => void;
  product: string;
  query: string;
}) {
  const changeCollapsed = (next: boolean) => onCollapsedChange?.(next);
  const visible = conversationName.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  return (
    <aside
      className={`messenger-drawer${collapsed ? " collapsed" : ""}`}
      aria-label="Workspace navigation"
    >
      <WorkspaceDrawerHeader
        collapsed={collapsed}
        logoSrc={logoSrc}
        onCollapsedChange={changeCollapsed}
        product={product}
      />
      <label className="workspace-drawer-search">
        <Search size={16} />
        <input
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={
            activeSpace === "agent" || activeSpace === "archives"
              ? "Search agent chats..."
              : activeSpace === "projects"
                ? "Search projects..."
                : "Search contacts..."
          }
          value={query}
        />
      </label>
      {activeSpace === "agent" || activeSpace === "archives" ? (
        <AgentConversationList
          activeConversationId={activeAgentConversationId}
          archiveActive={activeSpace === "archives"}
          archivedChatCount={archivedChatCount}
          chats={agentChats}
          onArchiveChat={onArchiveAgentChat}
          onNewChat={onNewAgentChat}
          onOpenArchived={onOpenArchived}
          onOpenChat={onOpenAgentChat}
          onSetPinned={onSetAgentChatPinned}
          projects={agentProjects}
          query={query}
        />
      ) : activeSpace === "projects" ? (
        <ProjectNavigationList onOpen={onOpenProject} projects={agentProjects} query={query} />
      ) : (
        <section className="messenger-contact-list" aria-label="Conversations">
          {visible ? (
          <button aria-current="page" type="button">
            <span>
              <Users size={16} />
            </span>
            <div>
              <strong>{conversationName}</strong>
              <small>Web, desktop, and mobile</small>
            </div>
          </button>
          ) : (
            <p>No matching contacts</p>
          )}
        </section>
      )}
    </aside>
  );
}

function ProjectNavigationList({
  onOpen,
  projects,
  query
}: {
  onOpen: (project: CoworkerProject) => void;
  projects: CoworkerProject[];
  query: string;
}) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visible = projects.filter((project) =>
    `${project.title} ${project.repositoryName ?? ""}`.toLocaleLowerCase().includes(normalizedQuery)
  );
  return (
    <section className="project-navigation-list" aria-label="Connected projects">
      {visible.map((project) => (
        <button key={project.id} onClick={() => onOpen(project)} type="button">
          <FolderPlus size={15} />
          <span>
            <strong>{project.title}</strong>
            <small>{project.repositoryName || project.key}</small>
          </span>
        </button>
      ))}
      {!visible.length ? (
        <p>{normalizedQuery ? "No matching projects" : "No connected projects"}</p>
      ) : null}
    </section>
  );
}

function AgentConversationList({
  activeConversationId,
  archiveActive,
  archivedChatCount,
  chats,
  onArchiveChat,
  onNewChat,
  onOpenArchived,
  onOpenChat,
  onSetPinned,
  projects,
  query
}: {
  activeConversationId: string | null;
  archiveActive: boolean;
  archivedChatCount: number;
  chats: CoworkerChat[];
  onArchiveChat: (conversationId: string) => void;
  onNewChat: () => void;
  onOpenArchived: () => void;
  onOpenChat: (conversationId: string) => void;
  onSetPinned: (conversationId: string, pinned: boolean) => void;
  projects: CoworkerProject[];
  query: string;
}) {
  const projectNames = new Map(projects.map((project) => [project.id, project.title]));
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleChats = chats.filter((chat) => {
    const projectName = projectNames.get(chat.projectUuid) ?? "General";
    return `${chat.title} ${projectName}`.toLocaleLowerCase().includes(normalizedQuery);
  });
  const pinnedChats = visibleChats.filter((chat) => chat.pinnedAt);
  const recentChats = visibleChats.filter((chat) => !chat.pinnedAt);
  return (
    <section className="agent-conversation-list" aria-label="Agent conversations">
      <button className="agent-new-chat" onClick={onNewChat} type="button">
        <Plus size={16} />
        <span>New agent chat</span>
      </button>
      <button
        aria-current={archiveActive ? "page" : undefined}
        className="agent-archive-link"
        onClick={onOpenArchived}
        type="button"
      >
        <Archive size={15} />
        <span>Archived chats</span>
        {archivedChatCount ? <small>{archivedChatCount}</small> : null}
      </button>
      {visibleChats.length ? (
        <div className="agent-history-groups">
          {pinnedChats.length ? (
            <AgentConversationGroup
              activeConversationId={activeConversationId}
              chats={pinnedChats}
              label="Pinned"
              onArchiveChat={onArchiveChat}
              onOpenChat={onOpenChat}
              onSetPinned={onSetPinned}
            />
          ) : null}
          {[...new Set(recentChats.map((chat) => projectNames.get(chat.projectUuid) ?? "General"))].map(
            (projectName) => (
              <AgentConversationGroup
                activeConversationId={activeConversationId}
                chats={recentChats.filter(
                  (chat) => (projectNames.get(chat.projectUuid) ?? "General") === projectName
                )}
                key={projectName}
                label={projectName}
                onArchiveChat={onArchiveChat}
                onOpenChat={onOpenChat}
                onSetPinned={onSetPinned}
              />
            )
          )}
        </div>
      ) : (
        <p>{normalizedQuery ? "No matching agent chats" : "No agent conversations yet"}</p>
      )}
    </section>
  );
}

function AgentConversationGroup({
  activeConversationId,
  chats,
  label,
  onArchiveChat,
  onOpenChat,
  onSetPinned
}: {
  activeConversationId: string | null;
  chats: CoworkerChat[];
  label: string;
  onArchiveChat: (conversationId: string) => void;
  onOpenChat: (conversationId: string) => void;
  onSetPinned: (conversationId: string, pinned: boolean) => void;
}) {
  return (
    <section>
      <h2>{label}</h2>
      {chats.map((chat) => (
        <div className="agent-history-row" key={chat.uuid}>
          <button
            aria-current={activeConversationId === chat.uuid ? "page" : undefined}
            className="agent-history-open"
            onClick={() => onOpenChat(chat.uuid)}
            type="button"
          >
            <Bot size={15} />
            <span>
              <strong>{chat.title}</strong>
              <small>{formatRecentTime(chat.updatedAt)}</small>
            </span>
          </button>
          <span className="agent-history-actions">
            <button
              aria-label={chat.pinnedAt ? `Unpin ${chat.title}` : `Pin ${chat.title}`}
              onClick={() => onSetPinned(chat.uuid, !chat.pinnedAt)}
              title={chat.pinnedAt ? "Unpin conversation" : "Pin conversation"}
              type="button"
            >
              {chat.pinnedAt ? <PinOff size={14} /> : <Pin size={14} />}
            </button>
            <button
              aria-label={`Archive ${chat.title}`}
              onClick={() => onArchiveChat(chat.uuid)}
              title="Archive conversation"
              type="button"
            >
              <Archive size={14} />
            </button>
          </span>
        </div>
      ))}
    </section>
  );
}

function formatRecentTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

async function request<T>(
  baseUrl: string,
  path: string,
  headers: Record<string, string>,
  init: RequestInit = {}
) {
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers });
  const envelope = (await response.json()) as Envelope<T>;
  if (!response.ok || !envelope.success)
    throw new Error(envelope.success ? "Request failed." : envelope.error.message);
  return envelope.data;
}

function label(client: MessengerClientKind) {
  return client[0]!.toUpperCase() + client.slice(1);
}

function mergeMessage(messages: Message[], message: Message) {
  return reconcileMessages(messages, [message]);
}

function reconcileMessages(current: Message[], latest: Message[]) {
  const messages = new Map(current.map((message) => [message.uuid, message]));
  latest.forEach((message) => messages.set(message.uuid, message));
  return [...messages.values()].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt)
  );
}

function messageFrom(reason: unknown) {
  return reason instanceof Error
    ? reason.message
    : "Messenger could not connect. Please try again.";
}

function plainText(value: string) {
  return value.replace(/<[^>]*>/gu, "").trim();
}
