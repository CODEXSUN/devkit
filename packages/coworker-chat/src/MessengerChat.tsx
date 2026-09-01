import {
  Archive,
  Bell,
  BellOff,
  Bot,
  BookOpen,
  Check,
  CheckCheck,
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
import { lazy, Suspense, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WorkspaceDrawerHeader } from "./WorkspaceDrawerHeader";
import { SettingsWorkspace } from "./SettingsWorkspace";
import { WorkspaceSearchPalette, type WorkspaceSearchItem } from "./WorkspaceSearchPalette";
import { AgentChatWorkspace } from "./AgentChatWorkspace";
import { ArchivedChatsPage } from "./ArchivedChatsPage";
import { CoworkerClient } from "./client";
import {
  MessengerActivityPanel,
  MessengerDeviceWorkspace,
  ProjectSpace
} from "./MessengerWorkspace";
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
  MessengerConversation,
  MessengerProfile
} from "./messenger-client";
import type { CoworkerChat, CoworkerProject } from "./types";

const ProjectOverviewSpace = lazy(() =>
  import("./ProjectOverviewSpace").then((module) => ({ default: module.ProjectOverviewSpace }))
);

export { MessengerConnectionPanel } from "./MessengerConnectionPanel";
export type { MessengerConnectionState } from "./MessengerConnectionPanel";
export { AgentConnectionPanel } from "./AgentConnectionPanel";

export type { MessengerClientKind } from "./messenger-client";
type WorkspaceSpace =
  | "agent"
  | "archives"
  | "connection"
  | "docs"
  | "ideas"
  | "messenger"
  | "projects"
  | "settings"
  | "todos";
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
  onUnreadCountChange?: (count: number) => void;
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
  onUnreadCountChange,
  onToggleSidePanel,
  product = "DevKit",
  sidePanel,
  sidePanelOpen = false,
  token,
  workspaceName = "DevKit product roadmap"
}: MessengerProps) {
  const baseUrl = apiUrl.replace(/\/+$/u, "");
  const [activeSpace, setActiveSpace] = useState<WorkspaceSpace>("messenger");
  const [unsavedIdeaCount, setUnsavedIdeaCount] = useState(countUnsavedIdeaDrafts);
  const [drawerQuery, setDrawerQuery] = useState("");
  const globalSearchRef = useRef<HTMLButtonElement>(null);
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [agentChats, setAgentChats] = useState<CoworkerChat[]>([]);
  const [archivedAgentChats, setArchivedAgentChats] = useState<CoworkerChat[]>([]);
  const [agentProjects, setAgentProjects] = useState<CoworkerProject[]>([]);
  const [overviewProject, setOverviewProject] = useState<CoworkerProject | null>(null);
  const agentProjectId = overviewProject?.id ?? null;
  const [agentConversationId, setAgentConversationId] = useState<string | null>(null);
  const [conversationMenuOpen, setConversationMenuOpen] = useState(false);
  const activeSidePanel =
    activeSpace === "agent"
      ? (agentSidePanel ?? sidePanel)
      : activeSpace === "messenger"
        ? sidePanel
        : null;

  useEffect(() => {
    const refresh = () => setUnsavedIdeaCount(countUnsavedIdeaDrafts());
    window.addEventListener("devkit:idea-drafts-change", refresh);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("devkit:idea-drafts-change", refresh);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const {
    activity,
    attachmentBlob,
    connected,
    connectionStatus,
    contacts,
    conversations,
    error: messengerError,
    messages,
    notificationPermission,
    onlineActorIds,
    peerActorId,
    profile,
    profileId,
    react,
    refresh,
    requestNotifications,
    send: sendMessage,
    sending,
    setPeerActorId,
    syncing,
    updateConversationPreferences
  } = useMessenger({ active: activeSpace === "messenger", apiUrl: baseUrl, clientKind, token });
  const currentUser = profile ?? profileFromSessionToken(token);
  const totalUnread = conversations.reduce(
    (total, conversation) => total + conversation.unreadCount,
    0
  );
  useEffect(() => onUnreadCountChange?.(totalUnread), [onUnreadCountChange, totalUnread]);
  useEffect(() => () => onUnreadCountChange?.(0), [onUnreadCountChange]);
  const [workspaceError, setWorkspaceError] = useState("");
  const displayedError = activeSpace === "messenger" ? messengerError : workspaceError;
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
    void refresh
      .then(() => setWorkspaceError(""))
      .catch((reason) => setWorkspaceError(messageFrom(reason)));
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

  useEffect(() => {
    if (!conversationMenuOpen) return;
    const close = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (
        event instanceof PointerEvent &&
        event.target instanceof Element &&
        event.target.closest(".messenger-conversation-menu")
      )
        return;
      setConversationMenuOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, [conversationMenuOpen]);

  const selectedContact = contacts.find((contact) => contact.uuid === peerActorId);
  const selectedContactOnline = Boolean(peerActorId && onlineActorIds.includes(peerActorId));
  const headerTitle =
    activeSpace === "messenger" ? selectedContact?.name ?? conversationName : workspaceTitle(activeSpace);
  const openedProject = overviewProject?.title ?? workspaceName;
  const searchItems = useMemo<WorkspaceSearchItem[]>(() => {
    const openSpace = (space: WorkspaceSpace) => () => {
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
        run: () => setActiveSpace("settings")
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
      className={`messenger-shell${drawerCollapsed ? " drawer-collapsed" : ""}${activeSidePanel ? " has-side-panel" : ""}${activeSidePanel && sidePanelOpen ? " side-panel-open" : ""}`}
    >
      <MessengerActivityBar
        activeSpace={activeSpace}
        collapsed={drawerCollapsed}
        connectionHref={connectionHref}
        onOpenDocs={() => {
          setActiveSpace("docs");
        }}
        onCollapsedChange={onDrawerCollapsedChange}
        onOpenAgent={() => {
          setActiveSpace("agent");
        }}
        onOpenIdeas={() => {
          setActiveSpace("ideas");
        }}
        onOpenConnection={() => {
          setActiveSpace("connection");
        }}
        onOpenMessenger={() => {
          setActiveSpace("messenger");
        }}
        onOpenProjects={() => {
          setOverviewProject(null);
          setActiveSpace("projects");
        }}
        onOpenSettings={() => {
          setActiveSpace("settings");
          void refreshArchivedChats().catch((reason) => setWorkspaceError(messageFrom(reason)));
        }}
        onOpenTodos={() => {
          setActiveSpace("todos");
        }}
        unsavedIdeaCount={unsavedIdeaCount}
        unreadCount={totalUnread}
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
        onlineActorIds={onlineActorIds}
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
        clientKind={clientKind}
        profileId={profileId}
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
          <div className={`messenger-header-title${activeSpace === "messenger" && peerActorId ? " user" : ""}`}>
            {activeSpace === "settings" ? null : (
              <>
                {activeSpace === "messenger" && peerActorId ? (
                  <MessengerAvatar name={headerTitle} online={selectedContactOnline} />
                ) : null}
                <strong>{headerTitle}</strong>
                {activeSpace === "archives" ? <span>Workspace</span> : null}
              </>
            )}
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
          <div className="messenger-context">
            {activeSpace === "agent" ||
            activeSpace === "ideas" ||
            activeSpace === "messenger" ||
            activeSpace === "todos" ||
            activeSpace === "projects" ? (
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
            ) : activeSpace === "settings" ? (
              <span className="messenger-status active">
                <i />
                Preferences
              </span>
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
            {activeSpace === "messenger" ? (
              <>
                <span
                  aria-label={connected ? "Messenger online" : "Messenger offline"}
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
                <MessengerConversationMenu
                  conversations={conversations}
                  messages={messages}
                  onClose={() => setConversationMenuOpen(false)}
                  onOpenChange={setConversationMenuOpen}
                  onShowDetails={() => onToggleSidePanel?.()}
                  onUpdatePreferences={updateConversationPreferences}
                  open={conversationMenuOpen}
                  peerActorId={peerActorId}
                />
              </>
            ) : activeSpace === "archives" ? (
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
        </header>
        {activeSpace === "settings" ? (
          <SettingsWorkspace
            apiUrl={baseUrl}
            archivedChatCount={archivedAgentChats.length}
            clientKind={clientKind}
            notificationPermission={notificationPermission}
            onEnableNotifications={() => void requestNotifications()}
            onOpenArchived={() => setActiveSpace("archives")}
            token={token}
            user={currentUser}
          />
        ) : activeSpace === "docs" ? (
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
          <section className="ideas-scroll"><IdeasWorkspace client={agentClient} /></section>
        ) : activeSpace === "projects" && overviewProject ? (
          <Suspense fallback={<section className="project-overview-space" aria-busy="true" />}>
            <ProjectOverviewSpace
              client={agentClient}
              onArchived={(project) => {
                setAgentProjects((current) => current.filter((item) => item.id !== project.id));
                setOverviewProject(null);
              }}
              onUpdated={(project) => {
                setAgentProjects((current) =>
                  current.map((item) => (item.id === project.id ? project : item))
                );
                setOverviewProject(project);
              }}
              project={overviewProject}
            />
          </Suspense>
        ) : activeSpace === "projects" ? (
          <ProjectSpace
            client={agentClient}
            clientKind={clientKind}
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
            attachmentBlob={attachmentBlob}
            clientKind={clientKind}
            contacts={contacts}
            error={displayedError}
            messages={messages}
            onRefresh={refresh}
            onReact={react}
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

function MessengerConversationMenu({
  conversations,
  messages,
  onClose,
  onOpenChange,
  onShowDetails,
  onUpdatePreferences,
  open,
  peerActorId
}: {
  conversations: MessengerConversation[];
  messages: ReturnType<typeof useMessenger>["messages"];
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
  onShowDetails: () => void;
  onUpdatePreferences: (
    conversationId: string,
    input: { archived?: boolean; muted?: boolean }
  ) => Promise<void>;
  open: boolean;
  peerActorId: string;
}) {
  const conversation = conversations.find((item) =>
    peerActorId ? item.peerActorId === peerActorId : item.kind === "device"
  );
  function exportChat() {
    const text = messages
      .map(
        (message) =>
          `[${new Date(message.createdAt).toLocaleString()}] ${message.actorId}: ${message.body}`
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "messenger-chat.txt";
    anchor.click();
    URL.revokeObjectURL(url);
    onClose();
  }
  return (
    <div className="messenger-conversation-menu">
      <button
        aria-expanded={open}
        aria-label="Conversation menu"
        onClick={() => onOpenChange(!open)}
        type="button"
      >
        <ChevronDown size={16} />
      </button>
      {open ? (
        <div role="menu">
          <button
            onClick={() => {
              onShowDetails();
              onClose();
            }}
            role="menuitem"
            type="button"
          >
            Conversation info
          </button>
          <button
            disabled={!conversation}
            onClick={() =>
              conversation &&
              void onUpdatePreferences(conversation.id, { muted: !conversation.mutedAt }).then(
                onClose
              )
            }
            role="menuitem"
            type="button"
          >
            {conversation?.mutedAt ? "Unmute notifications" : "Mute notifications"}
          </button>
          <button
            disabled={!conversation}
            onClick={() =>
              conversation &&
              void onUpdatePreferences(conversation.id, { archived: true }).then(onClose)
            }
            role="menuitem"
            type="button"
          >
            Archive chat
          </button>
          <button onClick={exportChat} role="menuitem" type="button">
            Export chat
          </button>
        </div>
      ) : null}
    </div>
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
  if (activeSpace === "settings") return "Settings";
  if (activeSpace === "docs") return "Documentation";
  if (activeSpace === "connection") return "Connect Service";
  if (activeSpace === "agent") return "Agent chat";
  if (activeSpace === "ideas") return "Ideas";
  if (activeSpace === "archives") return "Archived chats";
  if (activeSpace === "projects") return "Projects";
  if (activeSpace === "todos") return "Todos";
  return "Messenger";
}

function profileFromSessionToken(token: string): MessengerProfile | undefined {
  try {
    const payload = token.split(".")[1];
    if (!payload) return undefined;
    const decoded = atob(payload.replace(/-/gu, "+").replace(/_/gu, "/"));
    const claims = JSON.parse(decoded) as { email?: string; name?: string; sub?: string };
    const email = claims.email?.trim();
    if (!email) return undefined;
    return {
      email,
      name: claims.name?.trim() || email.split("@")[0] || email,
      uuid: claims.sub?.trim() || email
    };
  } catch {
    return undefined;
  }
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
  unsavedIdeaCount,
  unreadCount
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
  unsavedIdeaCount: number;
  unreadCount: number;
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
        {unreadCount ? (
          <b className="messenger-activity-unread">{unreadCount > 99 ? "99+" : unreadCount}</b>
        ) : null}
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
        aria-label={
          unsavedIdeaCount
            ? `Ideas, ${unsavedIdeaCount} unsaved ${unsavedIdeaCount === 1 ? "draft" : "drafts"}`
            : "Ideas"
        }
        onClick={onOpenIdeas}
        title={
          unsavedIdeaCount
            ? `Ideas · ${unsavedIdeaCount} unsaved ${unsavedIdeaCount === 1 ? "draft" : "drafts"}`
            : "Ideas"
        }
        type="button"
      >
        <Lightbulb size={18} />
        {unsavedIdeaCount ? (
          <b className="messenger-activity-draft-count">
            {unsavedIdeaCount > 99 ? "99+" : unsavedIdeaCount}
          </b>
        ) : null}
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
          aria-current={
            activeSpace === "settings" || activeSpace === "archives" ? "page" : undefined
          }
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
  clientKind,
  conversations,
  collapsed,
  conversationName,
  logoSrc,
  onlineActorIds,
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
  selectedMessengerPeerId,
  profileId
}: {
  activeAgentConversationId: string | null;
  activeSpace: WorkspaceSpace;
  agentChats: CoworkerChat[];
  agentProjects: CoworkerProject[];
  contacts: MessengerContact[];
  clientKind: MessengerClientKind;
  conversations: MessengerConversation[];
  collapsed: boolean;
  conversationName: string;
  logoSrc?: string | undefined;
  onlineActorIds: string[];
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
  profileId: string;
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
          onlineActorIds={onlineActorIds}
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
          clientKind={clientKind}
          contacts={contacts}
          conversationName={conversationName}
          conversations={conversations}
          onOpen={onOpenMessengerConversation}
          onPreference={onMessengerPreference}
          onlineActorIds={onlineActorIds}
          profileId={profileId}
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
  onlineActorIds,
  onClose,
  onOpen,
  query
}: {
  contacts: MessengerContact[];
  conversations: MessengerConversation[];
  onlineActorIds: string[];
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
              <MessengerAvatar name={contact.name} online={onlineActorIds.includes(contact.uuid)} />
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
  clientKind,
  contacts,
  conversationName,
  conversations,
  onOpen,
  onPreference,
  onlineActorIds,
  profileId,
  query,
  selectedPeerId
}: {
  clientKind: MessengerClientKind;
  contacts: MessengerContact[];
  conversationName: string;
  conversations: MessengerConversation[];
  onOpen: (peerId: string) => void;
  onPreference: (conversationId: string, input: { archived?: boolean; muted?: boolean }) => void;
  onlineActorIds: string[];
  profileId: string;
  query: string;
  selectedPeerId: string;
}) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const device = conversations.find((conversation) => conversation.kind === "device");
  const rows = [
    { conversation: device, email: "Web, desktop, and mobile", name: conversationName, online: false, peerId: "" },
    ...contacts.map((contact) => ({
      conversation: conversations.find((item) => item.peerActorId === contact.uuid),
      email: contact.email,
      name: contact.name,
      online: onlineActorIds.includes(contact.uuid),
      peerId: contact.uuid
    }))
  ].filter((row) =>
    `${row.name} ${row.email} ${row.conversation?.lastMessage ?? ""}`
      .toLocaleLowerCase()
      .includes(normalizedQuery)
  );
  const current = rows.filter((row) => !row.conversation?.archivedAt).sort(compareConversationRows);
  const archived = rows.filter((row) => row.conversation?.archivedAt).sort(compareConversationRows);
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
            clientKind={clientKind}
            profileId={profileId}
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
                clientKind={clientKind}
                profileId={profileId}
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
  online: boolean;
  peerId: string;
};
function compareConversationRows(left: ConversationListRow, right: ConversationListRow) {
  const unread = (right.conversation?.unreadCount ?? 0) - (left.conversation?.unreadCount ?? 0);
  if (unread) return unread;
  return (right.conversation?.updatedAt ?? "").localeCompare(left.conversation?.updatedAt ?? "");
}
function MessengerConversationRow({
  clientKind,
  onOpen,
  onPreference,
  row,
  selected,
  profileId
}: {
  clientKind: MessengerClientKind;
  onOpen: (peerId: string) => void;
  onPreference: (conversationId: string, input: { archived?: boolean; muted?: boolean }) => void;
  row: ConversationListRow;
  selected: boolean;
  profileId: string;
}) {
  const lastMessageOwn = row.peerId
    ? row.conversation?.lastMessageActorId === profileId
    : row.conversation?.lastMessageClient === clientKind;
  return (
    <div className="messenger-conversation-row">
      <button
        aria-current={selected ? "page" : undefined}
        className="messenger-conversation-open"
        onClick={() => onOpen(row.peerId)}
        type="button"
      >
        {row.peerId ? <MessengerAvatar name={row.name} online={row.online} /> : <span><Users size={16} /></span>}
        <div>
          <strong>{row.name}</strong>
          <small className="messenger-conversation-preview">
            {lastMessageOwn ? (
              <ConversationReceipt
                delivered={Boolean(row.conversation?.lastMessageDeliveredAt)}
                read={Boolean(row.conversation?.lastMessageReadAt)}
              />
            ) : null}
            <span>{row.conversation?.lastMessage || row.email}</span>
          </small>
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

function MessengerAvatar({ name, online }: { name: string; online: boolean }) {
  const initials = name.split(/\s+/u).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "U";
  return <span aria-label={`${name}${online ? ", online" : ""}`} className="messenger-user-avatar"><b aria-hidden="true">{initials}</b>{online ? <i aria-hidden="true" /> : null}</span>;
}

function ConversationReceipt({ delivered, read }: { delivered: boolean; read: boolean }) {
  if (read) return <CheckCheck aria-label="Read" className="read" size={14} />;
  if (delivered) return <CheckCheck aria-label="Delivered" size={14} />;
  return <Check aria-label="Sent" size={13} />;
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

function countUnsavedIdeaDrafts() {
  if (typeof window === "undefined") return 0;
  let count = 0;
  for (let index = 0; index < window.localStorage.length; index += 1) {
    if (window.localStorage.key(index)?.startsWith("devkit:idea-recovery:")) count += 1;
  }
  return count;
}
