import {
  Archive,
  Bell,
  BellOff,
  Bot,
  BookOpen,
  ChevronDown,
  ChevronRight,
  ListTodo,
  FolderPlus,
  Lightbulb,
  Link2,
  Menu,
  MessageCircle,
  PanelRightClose,
  PanelRightOpen,
  Pin,
  PinOff,
  Search,
  Settings,
  Users,
  Plus,
  X
} from "lucide-react";
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WorkspaceDrawerHeader } from "./WorkspaceDrawerHeader";
import { WorkspaceSettingsDrawer } from "./WorkspaceSettingsDrawer";
import { WorkspaceSearchPalette, type WorkspaceSearchItem } from "./WorkspaceSearchPalette";
import { AgentChatWorkspace } from "./AgentChatWorkspace";
import { ArchivedChatsPage } from "./ArchivedChatsPage";
import { CoworkerClient } from "./client";
import {
  MessengerActivityPanel,
  MessengerDeviceWorkspace,
  ProjectSpace
} from "./MessengerWorkspace";
import { ProjectOverviewSpace } from "./ProjectOverviewSpace";
import { IdeasWorkspace } from "./IdeasWorkspace";
import { TodoSpace } from "./TodoSpace";
import { ConnectionServiceWorkspace } from "./ConnectionServiceWorkspace";
import { DocumentationWorkspace } from "./DocumentationWorkspace";
import { ProjectDropdown } from "./TodoOptionDropdown";
import { useMessenger } from "./use-messenger";
import type {
  MessengerActivity,
  MessengerClientKind,
  MessengerContact,
  MessengerConversation
} from "./messenger-client";
import type { CoworkerChat, CoworkerProject } from "./types";

export { MessengerConnectionPanel } from "./MessengerConnectionPanel";
export type { MessengerConnectionState } from "./MessengerConnectionPanel";
export { AgentConnectionPanel } from "./AgentConnectionPanel";

export type { MessengerClientKind } from "./messenger-client";
type WorkspaceSpace =
  "agent" | "archives" | "connection" | "docs" | "ideas" | "messenger" | "projects" | "todos";
type MessengerProps = {
  apiUrl: string;
  clientKind: MessengerClientKind;
  connectionHref?: string | undefined;
  conversationName?: string;
  drawerCollapsed?: boolean;
  logoSrc?: string;
  onConnectionStateChange?: (
    state: import("./MessengerConnectionPanel").MessengerConnectionState
  ) => void;
  onDrawerCollapsedChange?: (collapsed: boolean) => void;
  onToggleSidePanel?: () => void;
  product?: string;
  sidePanel?: ReactNode;
  agentSidePanel?: ReactNode;
  sidePanelOpen?: boolean;
  token: string;
  workspaceName?: string;
};

export function MessengerChat({
  agentSidePanel,
  apiUrl,
  clientKind,
  connectionHref,
  conversationName = "My Devices",
  drawerCollapsed = false,
  logoSrc,
  onConnectionStateChange,
  onDrawerCollapsedChange,
  onToggleSidePanel,
  product = "DevKit",
  sidePanel,
  sidePanelOpen = false,
  token,
  workspaceName = "DevKit product roadmap"
}: MessengerProps) {
  const baseUrl = apiUrl.replace(/\/+$/u, "");
  const [activeSpace, setActiveSpace] = useState<WorkspaceSpace>("messenger");
  const [drawerQuery, setDrawerQuery] = useState("");
  const globalSearchRef = useRef<HTMLButtonElement>(null);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [agentChats, setAgentChats] = useState<CoworkerChat[]>([]);
  const [archivedAgentChats, setArchivedAgentChats] = useState<CoworkerChat[]>([]);
  const [agentProjects, setAgentProjects] = useState<CoworkerProject[]>([]);
  const [overviewProject, setOverviewProject] = useState<CoworkerProject | null>(null);
  const agentProjectId = overviewProject?.id ?? null;
  const [agentConversationId, setAgentConversationId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const activeSidePanel = activeSpace === "agent" ? (agentSidePanel ?? sidePanel) : sidePanel;
  const {
    activity,
    connected,
    connectionStatus,
    contacts,
    conversations,
    error: messengerError,
    messages,
    peerActorId,
    profileId,
    refresh,
    send: sendMessage,
    sending,
    setPeerActorId,
    syncing,
    updateConversationPreferences
  } = useMessenger({ apiUrl: baseUrl, clientKind, token });
  const [workspaceError, setWorkspaceError] = useState("");
  const displayedError = messengerError || workspaceError;
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
    : connectionStatus === "reconnecting"
      ? "reconnecting"
      : messengerError || workspaceError
        ? "error"
        : syncing
          ? "connecting"
          : "offline";
  useEffect(() => {
    onConnectionStateChange?.(connectionState);
  }, [connectionState, onConnectionStateChange]);

  useEffect(() => {
    if (
      activeSpace !== "agent" &&
      activeSpace !== "archives" &&
      activeSpace !== "projects" &&
      activeSpace !== "todos"
    )
      return;
    const refresh =
      activeSpace === "archives"
        ? Promise.all([refreshAgentNavigation(), refreshArchivedChats()])
        : refreshAgentNavigation();
    void refresh.catch((reason) => setWorkspaceError(messageFrom(reason)));
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setGlobalSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const headerTitle = workspaceTitle(activeSpace);
  const openedProject = overviewProject?.title ?? workspaceName;
  const searchItems = useMemo<WorkspaceSearchItem[]>(() => {
    const openSpace = (space: WorkspaceSpace) => () => {
      setSettingsOpen(false);
      setActiveSpace(space);
    };
    return [
      {
        detail: "Capture global proposals and connect them to projects",
        group: "Commands",
        id: "command:ideas",
        kind: "project",
        label: "Go to Ideas",
        run: openSpace("ideas")
      },
      {
        detail: "Open device and private conversations",
        group: "Commands",
        id: "command:messenger",
        kind: "contact",
        label: "Go to Messenger",
        run: openSpace("messenger")
      },
      {
        detail: "Start or continue work with Codex",
        group: "Commands",
        id: "command:agent",
        kind: "agent",
        label: "Go to Agent chat",
        run: openSpace("agent")
      },
      {
        detail: "Open the shared task list",
        group: "Commands",
        id: "command:todos",
        kind: "todo",
        label: "Go to Todos",
        run: openSpace("todos")
      },
      {
        detail: "Browse linked engineering projects",
        group: "Commands",
        id: "command:projects",
        kind: "project",
        label: "Go to Projects",
        run: openSpace("projects")
      },
      {
        detail: "Review archived Agent conversations",
        group: "Commands",
        id: "command:archives",
        kind: "archive",
        label: "Open archived chats",
        run: openSpace("archives")
      },
      {
        detail: drawerCollapsed ? "Show workspace navigation" : "Hide workspace navigation",
        group: "Commands",
        id: "command:sidebar",
        kind: "panel",
        label: "Toggle sidebar",
        run: () => onDrawerCollapsedChange?.(!drawerCollapsed)
      },
      {
        detail: "Open workspace preferences",
        group: "Commands",
        id: "command:settings",
        kind: "settings",
        label: "Open settings",
        run: () => setSettingsOpen(true)
      },
      ...agentProjects.map((project) => ({
        detail: project.repositoryName ?? project.description ?? "Linked project",
        group: "Projects" as const,
        id: `project:${project.id}`,
        keywords: `${project.key} ${project.moduleKey}`,
        kind: "project" as const,
        label: project.title,
        run: () => {
          setOverviewProject(project);
          setActiveSpace("projects");
        }
      })),
      ...agentChats.map((chat) => ({
        detail:
          agentProjects.find((project) => project.id === chat.projectUuid)?.title ?? "Agent chat",
        group: "Conversations" as const,
        id: `chat:${chat.uuid}`,
        kind: "agent" as const,
        label: chat.title,
        run: () => {
          setAgentConversationId(chat.uuid);
          setActiveSpace("agent");
        }
      })),
      ...contacts.map((contact) => ({
        detail: contact.email,
        group: "Conversations" as const,
        id: `contact:${contact.uuid}`,
        kind: "contact" as const,
        label: contact.name,
        run: () => {
          setPeerActorId(contact.uuid);
          setActiveSpace("messenger");
        }
      }))
    ];
  }, [
    agentChats,
    agentProjects,
    contacts,
    drawerCollapsed,
    onDrawerCollapsedChange,
    setPeerActorId
  ]);

  return (
    <main
      className={`messenger-shell${drawerCollapsed ? " drawer-collapsed" : ""}${activeSidePanel ? " has-side-panel" : ""}${sidePanelOpen ? " side-panel-open" : ""}`}
    >
      <MessengerActivityBar
        activeSpace={activeSpace}
        collapsed={drawerCollapsed}
        connectionHref={connectionHref}
        onOpenDocs={() => {
          setSettingsOpen(false);
          setActiveSpace("docs");
        }}
        onCollapsedChange={onDrawerCollapsedChange}
        onOpenAgent={() => {
          setSettingsOpen(false);
          setActiveSpace("agent");
        }}
        onOpenIdeas={() => {
          setSettingsOpen(false);
          setActiveSpace("ideas");
        }}
        onOpenConnection={() => {
          setSettingsOpen(false);
          setActiveSpace("connection");
        }}
        onOpenMessenger={() => {
          setActiveSpace("messenger");
          setSettingsOpen(false);
        }}
        onOpenProjects={() => {
          setSettingsOpen(false);
          setOverviewProject(null);
          setActiveSpace("projects");
        }}
        onOpenSettings={() => {
          setSettingsOpen((open) => !open);
          void refreshArchivedChats().catch((reason) => setWorkspaceError(messageFrom(reason)));
        }}
        onOpenTodos={() => {
          setSettingsOpen(false);
          setActiveSpace("todos");
        }}
        settingsOpen={settingsOpen}
      />
      <WorkspaceSettingsDrawer
        archivedChatCount={archivedAgentChats.length}
        onClose={() => setSettingsOpen(false)}
        onOpenArchived={() => {
          setActiveSpace("archives");
          setSettingsOpen(false);
        }}
        open={settingsOpen}
      />
      <MessengerDevelopmentDrawer
        activeAgentConversationId={agentConversationId}
        activeSpace={activeSpace}
        agentChats={agentChats}
        agentProjects={agentProjects}
        contacts={contacts}
        conversations={conversations}
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
        onOpenMessengerConversation={(peerId) => {
          setPeerActorId(peerId);
          setActiveSpace("messenger");
        }}
        onMessengerPreference={(conversationId, input) =>
          void updateConversationPreferences(conversationId, input).catch((reason) =>
            setWorkspaceError(messageFrom(reason))
          )
        }
        selectedMessengerPeerId={peerActorId}
        onArchiveAgentChat={(conversationId) =>
          void archiveAgentChat(conversationId).catch((reason) =>
            setWorkspaceError(messageFrom(reason))
          )
        }
        onOpenAgentChat={setAgentConversationId}
        onSetAgentChatPinned={(conversationId, pinned) =>
          void setAgentChatPinned(conversationId, pinned).catch((reason) =>
            setWorkspaceError(messageFrom(reason))
          )
        }
        onOpenProject={(project) => {
          setOverviewProject(project);
          setActiveSpace("projects");
        }}
      />
      <section className="messenger-workspace">
        <header className="messenger-header">
          <div className="messenger-header-title">
            <strong>{headerTitle}</strong>
            {activeSpace === "archives" ? <span>Workspace</span> : null}
          </div>
          <button
            aria-haspopup="dialog"
            className="messenger-global-search"
            onClick={() => setGlobalSearchOpen(true)}
            ref={globalSearchRef}
            type="button"
          >
            <Search aria-hidden="true" size={16} />
            <span>Search workspace</span>
            <kbd>Ctrl K</kbd>
          </button>
          {activeSpace === "messenger" ? (
            <span
              aria-label={
                connected ? "Messenger online" : syncing ? "Messenger syncing" : "Messenger offline"
              }
              className={
                connected
                  ? "messenger-status messenger-status-dot active"
                  : "messenger-status messenger-status-dot"
              }
              role="status"
              title={connected ? "Online" : syncing ? "Syncing" : "Offline"}
            >
              <i />
            </span>
          ) : (
            <div className="messenger-context">
              {activeSpace === "agent" || activeSpace === "todos" || activeSpace === "projects" ? (
                <ProjectDropdown
                  onChange={(projectId) => {
                    setOverviewProject(
                      agentProjects.find((project) => project.id === projectId) ?? null
                    );
                    if (activeSpace === "agent") setAgentConversationId(null);
                  }}
                  projects={agentProjects}
                  value={agentProjectId ?? ""}
                />
              ) : activeSpace === "docs" ? (
                <button
                  className="messenger-project"
                  onClick={() => {
                    setOverviewProject(null);
                    setActiveSpace("projects");
                  }}
                  title="Open projects"
                  type="button"
                >
                  <FolderPlus size={16} />
                  <span>Projects</span>
                </button>
              ) : (
                <button
                  className="messenger-project"
                  title={`Opened project: ${openedProject}`}
                  type="button"
                >
                  <span>{openedProject}</span>
                  <ChevronDown size={15} />
                </button>
              )}
              {activeSpace === "archives" ? (
                <span className="messenger-status active">
                  <i />
                  Archive
                </span>
              ) : (
                <span
                  aria-label={connected ? `${headerTitle} online` : `${headerTitle} offline`}
                  className={
                    connected
                      ? "messenger-status messenger-status-dot active"
                      : "messenger-status messenger-status-dot"
                  }
                  role="status"
                  title={connected ? "Online" : "Offline"}
                >
                  <i />
                </span>
              )}
            </div>
          )}
        </header>
        {activeSpace === "docs" ? (
          <DocumentationWorkspace apiUrl={baseUrl} token={token} />
        ) : activeSpace === "connection" ? (
          <ConnectionServiceWorkspace apiUrl={baseUrl} clientKind={clientKind} token={token} />
        ) : activeSpace === "archives" ? (
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
        ) : activeSpace === "ideas" ? (
          <IdeasWorkspace client={agentClient} />
        ) : activeSpace === "projects" && overviewProject ? (
          <ProjectOverviewSpace client={agentClient} project={overviewProject} />
        ) : activeSpace === "projects" ? (
          <ProjectSpace
            client={agentClient}
            onCreated={(project) =>
              setAgentProjects((current) => [
                project,
                ...current.filter((item) => item.id !== project.id)
              ])
            }
            onOpen={setOverviewProject}
            projects={agentProjects}
          />
        ) : activeSpace === "todos" ? (
          <TodoSpace
            apiUrl={baseUrl}
            projects={agentProjects}
            selectedProjectId={agentProjectId}
            token={token}
          />
        ) : (
          <MessengerDeviceWorkspace
            contacts={contacts}
            error={displayedError}
            messages={messages}
            onRefresh={refresh}
            onSend={sendMessage}
            peerActorId={peerActorId}
            profileId={profileId}
            sending={sending}
            syncing={syncing}
          />
        )}
      </section>
      {activeSidePanel ? (
        <aside className="messenger-side-panel">
          {activeSpace === "messenger" ? (
            <MessengerDrawerControls
              activity={activity}
              contacts={contacts}
              conversationName={conversationName}
              onSelectPeer={setPeerActorId}
              peerActorId={peerActorId}
            />
          ) : null}
          {activeSidePanel}
        </aside>
      ) : null}
      {activeSidePanel && onToggleSidePanel ? (
        <MessengerRightActivityBar open={sidePanelOpen} onToggle={onToggleSidePanel} />
      ) : null}
      <WorkspaceSearchPalette
        items={searchItems}
        onClose={() => {
          setGlobalSearchOpen(false);
          window.setTimeout(() => globalSearchRef.current?.focus(), 0);
        }}
        open={globalSearchOpen}
      />
    </main>
  );
}

function MessengerDrawerControls({
  activity,
  contacts,
  conversationName,
  onSelectPeer,
  peerActorId
}: {
  activity: MessengerActivity[];
  contacts: MessengerContact[];
  conversationName: string;
  onSelectPeer: (peerActorId: string) => void;
  peerActorId: string;
}) {
  return (
    <div className="messenger-drawer-controls">
      <label>
        <span>Conversation</span>
        <select
          aria-label="Choose private conversation"
          onChange={(event) => onSelectPeer(event.target.value)}
          value={peerActorId}
        >
          <option value="">{conversationName}</option>
          {contacts.map((contact) => (
            <option key={contact.uuid} value={contact.uuid}>
              {contact.name}
            </option>
          ))}
        </select>
      </label>
      <MessengerActivityPanel activity={activity} />
    </div>
  );
}

function workspaceTitle(activeSpace: WorkspaceSpace) {
  if (activeSpace === "docs") return "Documentation";
  if (activeSpace === "connection") return "Connect Service";
  if (activeSpace === "agent") return "Agent chat";
  if (activeSpace === "ideas") return "Ideas";
  if (activeSpace === "archives") return "Archived chats";
  if (activeSpace === "projects") return "Projects";
  if (activeSpace === "todos") return "Todos";
  return "Messenger";
}

function MessengerActivityBar({
  activeSpace,
  collapsed,
  connectionHref,
  onOpenDocs,
  onCollapsedChange,
  onOpenAgent,
  onOpenIdeas,
  onOpenConnection,
  onOpenMessenger,
  onOpenProjects,
  onOpenSettings,
  onOpenTodos,
  settingsOpen
}: {
  activeSpace: WorkspaceSpace;
  collapsed: boolean;
  connectionHref?: string | undefined;
  onOpenDocs: () => void;
  onCollapsedChange?: ((collapsed: boolean) => void) | undefined;
  onOpenAgent: () => void;
  onOpenIdeas: () => void;
  onOpenConnection: () => void;
  onOpenMessenger: () => void;
  onOpenProjects: () => void;
  onOpenSettings: () => void;
  onOpenTodos: () => void;
  settingsOpen: boolean;
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
        aria-current={activeSpace === "agent" ? "page" : undefined}
        aria-label="Agent"
        onClick={onOpenAgent}
        title="Agent"
        type="button"
      >
        <Bot size={18} />
      </button>
      <button
        aria-current={activeSpace === "ideas" ? "page" : undefined}
        aria-label="Ideas"
        onClick={onOpenIdeas}
        title="Ideas"
        type="button"
      >
        <Lightbulb size={18} />
      </button>
      <button
        aria-current={activeSpace === "todos" ? "page" : undefined}
        aria-label="Todos"
        onClick={onOpenTodos}
        title="Todos"
        type="button"
      >
        <ListTodo size={18} />
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
      <div className="activity-footer">
        <button
          aria-current={activeSpace === "docs" ? "page" : undefined}
          aria-label="Documentation"
          onClick={onOpenDocs}
          title="Documentation"
          type="button"
        >
          <BookOpen size={18} />
        </button>
        {connectionHref ? (
          <a aria-label="Connect Service" href={connectionHref} title="Connect Service">
            <Link2 size={18} />
          </a>
        ) : (
          <button
            aria-current={activeSpace === "connection" ? "page" : undefined}
            aria-label="Connect Service"
            onClick={onOpenConnection}
            title="Connect Service"
            type="button"
          >
            <Link2 size={18} />
          </button>
        )}
        <button
          aria-current={settingsOpen || activeSpace === "archives" ? "page" : undefined}
          aria-label="Settings"
          onClick={onOpenSettings}
          title="Settings"
          type="button"
        >
          <Settings size={18} />
        </button>
      </div>
    </nav>
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
  agentProjects,
  contacts,
  conversations,
  collapsed,
  conversationName,
  logoSrc,
  onCollapsedChange,
  onMessengerPreference,
  onOpenMessengerConversation,
  onArchiveAgentChat,
  onNewAgentChat,
  onOpenAgentChat,
  onOpenProject,
  onSetAgentChatPinned,
  onQueryChange,
  product,
  query,
  selectedMessengerPeerId
}: {
  activeAgentConversationId: string | null;
  activeSpace: WorkspaceSpace;
  agentChats: CoworkerChat[];
  agentProjects: CoworkerProject[];
  contacts: MessengerContact[];
  conversations: MessengerConversation[];
  collapsed: boolean;
  conversationName: string;
  logoSrc?: string | undefined;
  onCollapsedChange?: ((collapsed: boolean) => void) | undefined;
  onMessengerPreference: (
    conversationId: string,
    input: { archived?: boolean; muted?: boolean }
  ) => void;
  onOpenMessengerConversation: (peerId: string) => void;
  onArchiveAgentChat: (conversationId: string) => void;
  onNewAgentChat: () => void;
  onOpenAgentChat: (conversationId: string) => void;
  onOpenProject: (project: CoworkerProject) => void;
  onSetAgentChatPinned: (conversationId: string, pinned: boolean) => void;
  onQueryChange: (query: string) => void;
  product: string;
  query: string;
  selectedMessengerPeerId: string;
}) {
  const changeCollapsed = (next: boolean) => onCollapsedChange?.(next);
  const [contactPickerOpen, setContactPickerOpen] = useState(false);
  const messengerSpace = activeSpace === "messenger";
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
      <div className="workspace-drawer-search">
        <Search aria-hidden="true" size={16} />
        <input
          aria-label={messengerSpace ? "Search contacts" : "Search workspace navigation"}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={
            activeSpace === "agent" || activeSpace === "archives"
              ? "Search agent chats..."
              : activeSpace === "todos"
                ? "Todos"
                : activeSpace === "projects"
                  ? "Search projects..."
                  : "Search contacts..."
          }
          value={query}
        />
        {messengerSpace ? (
          <button
            aria-expanded={contactPickerOpen}
            aria-label="Add user or contact"
            className="workspace-add-contact"
            onClick={() => setContactPickerOpen((open) => !open)}
            type="button"
          >
            <Plus size={18} />
          </button>
        ) : null}
      </div>
      {messengerSpace && contactPickerOpen ? (
        <ContactPicker
          contacts={contacts}
          conversations={conversations}
          onClose={() => setContactPickerOpen(false)}
          onOpen={(peerId) => {
            onOpenMessengerConversation(peerId);
            setContactPickerOpen(false);
            onQueryChange("");
          }}
          query={query}
        />
      ) : null}
      {activeSpace === "agent" || activeSpace === "archives" ? (
        <AgentConversationList
          activeConversationId={activeAgentConversationId}
          chats={agentChats}
          onArchiveChat={onArchiveAgentChat}
          onNewChat={onNewAgentChat}
          onOpenChat={onOpenAgentChat}
          onOpenProject={onOpenProject}
          onSetPinned={onSetAgentChatPinned}
          projects={agentProjects}
          query={query}
        />
      ) : activeSpace === "todos" ? (
        <section className="todo-navigation-list" aria-label="Todos">
          <CollapsibleDrawerBlock count={1} label="Todos">
            <div className="drawer-summary-row">
              <ListTodo size={16} />
              <span>
                <strong>Task Manager</strong>
                <small>Shared across all devices</small>
              </span>
            </div>
          </CollapsibleDrawerBlock>
        </section>
      ) : activeSpace === "projects" ? (
        <ProjectNavigationList onOpen={onOpenProject} projects={agentProjects} query={query} />
      ) : (
        <MessengerConversationList
          contacts={contacts}
          conversationName={conversationName}
          conversations={conversations}
          onOpen={onOpenMessengerConversation}
          onPreference={onMessengerPreference}
          query={query}
          selectedPeerId={selectedMessengerPeerId}
        />
      )}
    </aside>
  );
}

function ContactPicker({
  contacts,
  conversations,
  onClose,
  onOpen,
  query
}: {
  contacts: MessengerContact[];
  conversations: MessengerConversation[];
  onClose: () => void;
  onOpen: (peerId: string) => void;
  query: string;
}) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visible = contacts.filter((contact) =>
    `${contact.name} ${contact.email}`.toLocaleLowerCase().includes(normalizedQuery)
  );
  return (
    <aside aria-label="Add user or contact" className="workspace-contact-picker">
      <header>
        <div>
          <strong>Start a private chat</strong>
          <small>Select an active user or contact.</small>
        </div>
        <button aria-label="Close contact picker" onClick={onClose} type="button">
          <X size={15} />
        </button>
      </header>
      <div>
        {visible.map((contact) => {
          const existing = conversations.some(
            (conversation) => conversation.peerActorId === contact.uuid
          );
          return (
            <button key={contact.uuid} onClick={() => onOpen(contact.uuid)} type="button">
              <span>
                <Users size={15} />
              </span>
              <div>
                <strong>{contact.name}</strong>
                <small>{contact.email}</small>
              </div>
              <b>{existing ? "Open" : "Add"}</b>
            </button>
          );
        })}
        {!visible.length ? <p>No matching users.</p> : null}
      </div>
    </aside>
  );
}

function MessengerConversationList({
  contacts,
  conversationName,
  conversations,
  onOpen,
  onPreference,
  query,
  selectedPeerId
}: {
  contacts: MessengerContact[];
  conversationName: string;
  conversations: MessengerConversation[];
  onOpen: (peerId: string) => void;
  onPreference: (conversationId: string, input: { archived?: boolean; muted?: boolean }) => void;
  query: string;
  selectedPeerId: string;
}) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const device = conversations.find((conversation) => conversation.kind === "device");
  const rows = [
    { conversation: device, email: "Web, desktop, and mobile", name: conversationName, peerId: "" },
    ...contacts.map((contact) => ({
      conversation: conversations.find((item) => item.peerActorId === contact.uuid),
      email: contact.email,
      name: contact.name,
      peerId: contact.uuid
    }))
  ].filter((row) =>
    `${row.name} ${row.email} ${row.conversation?.lastMessage ?? ""}`
      .toLocaleLowerCase()
      .includes(normalizedQuery)
  );
  const current = rows.filter((row) => !row.conversation?.archivedAt);
  const archived = rows.filter((row) => row.conversation?.archivedAt);
  return (
    <section className="messenger-contact-list" aria-label="Conversations">
      <CollapsibleDrawerBlock count={current.length} label="Conversations">
        {current.map((row) => (
          <MessengerConversationRow
            key={row.peerId || "devices"}
            onOpen={onOpen}
            onPreference={onPreference}
            row={row}
            selected={row.peerId === selectedPeerId}
          />
        ))}
        {!current.length ? <p>No matching conversations</p> : null}
      </CollapsibleDrawerBlock>
      {archived.length ? (
        <CollapsibleDrawerBlock count={archived.length} label="Archived">
          <div>
            {archived.map((row) => (
              <MessengerConversationRow
                key={row.peerId}
                onOpen={onOpen}
                onPreference={onPreference}
                row={row}
                selected={row.peerId === selectedPeerId}
              />
            ))}
          </div>
        </CollapsibleDrawerBlock>
      ) : null}
    </section>
  );
}

type ConversationListRow = {
  conversation: MessengerConversation | undefined;
  email: string;
  name: string;
  peerId: string;
};
function MessengerConversationRow({
  onOpen,
  onPreference,
  row,
  selected
}: {
  onOpen: (peerId: string) => void;
  onPreference: (conversationId: string, input: { archived?: boolean; muted?: boolean }) => void;
  row: ConversationListRow;
  selected: boolean;
}) {
  return (
    <div className="messenger-conversation-row">
      <button
        aria-current={selected ? "page" : undefined}
        className="messenger-conversation-open"
        onClick={() => onOpen(row.peerId)}
        type="button"
      >
        <span>
          <Users size={16} />
        </span>
        <div>
          <strong>{row.name}</strong>
          <small>{row.conversation?.lastMessage || row.email}</small>
        </div>
        {row.conversation?.unreadCount ? <b>{row.conversation.unreadCount}</b> : null}
      </button>
      {row.conversation ? (
        <span className="messenger-conversation-actions">
          <button
            aria-label={`${row.conversation.mutedAt ? "Unmute" : "Mute"} ${row.name}`}
            onClick={() =>
              onPreference(row.conversation!.id, { muted: !row.conversation!.mutedAt })
            }
            type="button"
          >
            {row.conversation.mutedAt ? <Bell size={13} /> : <BellOff size={13} />}
          </button>
          <button
            aria-label={`${row.conversation.archivedAt ? "Restore" : "Archive"} ${row.name}`}
            onClick={() =>
              onPreference(row.conversation!.id, { archived: !row.conversation!.archivedAt })
            }
            type="button"
          >
            <Archive size={13} />
          </button>
        </span>
      ) : null}
    </div>
  );
}

function CollapsibleDrawerBlock({
  children,
  count,
  label
}: {
  children: ReactNode;
  count: number;
  label: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <details
      className="drawer-disclosure"
      onToggle={(event) => setOpen(event.currentTarget.open)}
      open={open}
    >
      <summary>
        <ChevronRight size={15} />
        <span>{label}</span>
        <small>{count}</small>
      </summary>
      <div className="drawer-section-content">
        <div>{children}</div>
      </div>
    </details>
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
  const [open, setOpen] = useState(true);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visible = projects.filter((project) =>
    `${project.title} ${project.repositoryName ?? ""}`.toLocaleLowerCase().includes(normalizedQuery)
  );
  return (
    <section className="project-navigation-list" aria-label="Connected projects">
      <details
        className="drawer-disclosure"
        onToggle={(event) => setOpen(event.currentTarget.open)}
        open={open}
      >
        <summary>
          <ChevronRight size={15} />
          <span>Project shortcuts</span>
          <small>{visible.length}</small>
        </summary>
        <div className="drawer-section-content">
          <div>
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
          </div>
        </div>
      </details>
    </section>
  );
}

function AgentConversationList({
  activeConversationId,
  chats,
  onArchiveChat,
  onNewChat,
  onOpenChat,
  onOpenProject,
  onSetPinned,
  projects,
  query
}: {
  activeConversationId: string | null;
  chats: CoworkerChat[];
  onArchiveChat: (conversationId: string) => void;
  onNewChat: () => void;
  onOpenChat: (conversationId: string) => void;
  onOpenProject: (project: CoworkerProject) => void;
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
          {[
            ...new Set(recentChats.map((chat) => projectNames.get(chat.projectUuid) ?? "General"))
          ].map((projectName) => (
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
          ))}
        </div>
      ) : (
        <p>{normalizedQuery ? "No matching agent chats" : "No agent conversations yet"}</p>
      )}
      <CollapsibleDrawerBlock count={projects.length} label="Project shortcuts">
        <div className="agent-project-shortcuts">
          {projects.map((project) => (
            <button key={project.id} onClick={() => onOpenProject(project)} type="button">
              <FolderPlus size={15} />
              <span>{project.title}</span>
            </button>
          ))}
        </div>
      </CollapsibleDrawerBlock>
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
  const [open, setOpen] = useState(false);
  return (
    <section>
      <details
        className="drawer-disclosure"
        onToggle={(event) => setOpen(event.currentTarget.open)}
        open={open}
      >
        <summary>
          <ChevronRight size={15} />
          <span>{label}</span>
          <small>{chats.length}</small>
        </summary>
        <div className="drawer-section-content">
          <div>
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
          </div>
        </div>
      </details>
    </section>
  );
}

function formatRecentTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent";
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
}

function messageFrom(reason: unknown) {
  return reason instanceof Error
    ? reason.message
    : "Messenger could not connect. Please try again.";
}
