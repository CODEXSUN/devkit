import {
  Bot,
  ChevronDown,
  FolderPlus,
  Menu,
  MessageCircle,
  PanelRightClose,
  PanelRightOpen,
  Search,
  SendHorizontal,
  Users
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

export { MessengerConnectionPanel } from "./MessengerConnectionPanel";
export type { MessengerConnectionState } from "./MessengerConnectionPanel";

export type MessengerClientKind = "desktop" | "mobile" | "web";
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
  const [activeSpace, setActiveSpace] = useState<"agent" | "messenger" | "projects">("messenger");
  const [connected, setConnected] = useState(false);
  const [drawerQuery, setDrawerQuery] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const headers = useMemo(
    () => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }),
    [token]
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
        collapsed={drawerCollapsed}
        conversationName={conversationName}
        logoSrc={logoSrc}
        onCollapsedChange={onDrawerCollapsedChange}
        product={product}
        query={drawerQuery}
        onQueryChange={setDrawerQuery}
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
                connected || activeSpace === "agent"
                  ? "messenger-status active"
                  : "messenger-status"
              }
            >
              <i />
              {activeSpace === "agent"
                ? "Codex"
                : connected
                  ? "Ready"
                  : syncing
                    ? "Syncing"
                    : "Offline"}
            </span>
          </div>
        </header>
        {activeSpace === "agent" ? (
          <AgentChatWorkspace apiUrl={baseUrl} connected={connected} token={token} />
        ) : activeSpace === "projects" ? (
          <ProjectSpace />
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
  activeSpace: "agent" | "messenger" | "projects";
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
        aria-current={activeSpace === "agent" ? "page" : undefined}
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

function ProjectSpace() {
  return (
    <section className="messenger-project-space">
      <div>
        <span>
          <FolderPlus size={22} />
        </span>
        <h1>Projects</h1>
        <p>Select or link a project to give the connected agent its workspace context.</p>
        <div className="messenger-project-actions">
          <button type="button">Create project</button>
          <button type="button">Link folder</button>
        </div>
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
  collapsed,
  conversationName,
  logoSrc,
  onCollapsedChange,
  onQueryChange,
  product,
  query
}: {
  collapsed: boolean;
  conversationName: string;
  logoSrc?: string | undefined;
  onCollapsedChange?: ((collapsed: boolean) => void) | undefined;
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
          placeholder="Search contacts..."
          value={query}
        />
      </label>
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
    </aside>
  );
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
