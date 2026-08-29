import {
  Check,
  ChevronDown,
  FolderPlus,
  FolderSymlink,
  Menu,
  MessageCircle,
  Mic,
  Paperclip,
  PanelRightClose,
  PanelRightOpen,
  SendHorizontal,
  Smile,
  Sparkles
} from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Textarea
} from "@codexsun/ui/coworker-dashboard";
import { FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CoworkerClient, type CoworkerBackend } from "./client";
import { CoworkerDrawer } from "./CoworkerDrawer";
import type {
  CoworkerChat as CoworkerChatRecord,
  CoworkerMessage,
  CoworkerProject,
  CoworkerProjectConnector
} from "./types";

export function CoworkerChat({
  apiUrl,
  backend,
  onCreateProject,
  onLinkProject,
  onOpenMessenger,
  onSessionTokenChange,
  onToggleSidePanel,
  sidePanel,
  sidePanelOpen = true,
  logoSrc,
  product = "DevKit"
}: {
  apiUrl: string;
  backend?: CoworkerBackend;
  onCreateProject?: CoworkerProjectConnector;
  onLinkProject?: CoworkerProjectConnector;
  onOpenMessenger?: () => void;
  onSessionTokenChange?: (token: string | null) => void;
  onToggleSidePanel?: () => void;
  sidePanel?: ReactNode;
  sidePanelOpen?: boolean;
  logoSrc?: string;
  product?: string;
}) {
  const [sessionToken, setSessionToken] = useState(() =>
    backend ? "local-codex" : localStorage.getItem("devkit_session")
  );
  const client = useMemo<CoworkerBackend>(
    () => backend ?? new CoworkerClient(apiUrl.replace(/\/+$/u, ""), () => sessionToken),
    [apiUrl, backend, sessionToken]
  );
  const [projects, setProjects] = useState<CoworkerProject[]>([]);
  const [project, setProject] = useState<CoworkerProject>();
  const [chats, setChats] = useState<CoworkerChatRecord[]>([]);
  const [messages, setMessages] = useState<CoworkerMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [composer, setComposer] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [projectDialog, setProjectDialog] = useState<"create" | "link" | null>(null);
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!sessionToken) return;
    void client
      .projects()
      .then(async (items) => {
        setProjects(items);
        const firstProject = items[0];
        setProject(firstProject);
        if (!firstProject) {
          setChats([]);
          return;
        }
        const chatItems = await client.chats();
        setChats(chatItems);
        await resumeLatest(
          client,
          firstProject,
          chatItems,
          setMessages,
          setConversationId,
          setThreadId
        );
      })
      .catch((error: unknown) =>
        setStatus(error instanceof Error ? error.message : "Could not load projects.")
      );
  }, [client, sessionToken]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    if (!composer) resizeComposer(composerRef.current);
  }, [composer]);
  useEffect(() => {
    const toggleDrawer = (event: KeyboardEvent) => {
      if (!event.ctrlKey || event.altKey || event.shiftKey || event.key.toLowerCase() !== "b") return;
      event.preventDefault();
      setDrawerCollapsed((current) => !current);
    };
    window.addEventListener("keydown", toggleDrawer);
    return () => window.removeEventListener("keydown", toggleDrawer);
  }, []);
  useEffect(() => onSessionTokenChange?.(sessionToken), [onSessionTokenChange, sessionToken]);
  useEffect(() => {
    if (!sessionToken || busy) return;
    const refresh = async () => {
      const chatItems = await client.chats();
      setChats(chatItems);
      if (!conversationId) return;
      const detail = await client.chat(conversationId);
      setThreadId(detail.codexThreadId);
      setMessages(
        detail.messages.map((message) => ({
          id: message.uuid,
          role: message.role,
          text: message.body
        }))
      );
    };
    const timer = window.setInterval(() => void refresh().catch(() => undefined), 1_500);
    return () => window.clearInterval(timer);
  }, [busy, client, conversationId, sessionToken]);

  if (!sessionToken)
    return (
      <CoworkerLogin
        client={client}
        onLogin={(token) => {
          localStorage.setItem("devkit_session", token);
          setSessionToken(token);
        }}
        product={product}
      />
    );

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = composer.trim();
    if (!text || !project || busy) return;
    const assistantId = crypto.randomUUID();
    setComposer("");
    setBusy(true);
    setStatus("Thinking");
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", text },
      { id: assistantId, role: "assistant", text: "" }
    ]);
    try {
      let streamError: string | null = null;
      await client.stream({ conversationId, message: text, project, threadId }, (chatEvent) => {
        if (chatEvent.type === "chat.started") {
          setConversationId(chatEvent.conversationId);
          setThreadId(chatEvent.threadId);
        }
        if (chatEvent.type === "chat.delta")
          setMessages((current) =>
            current.map((message) =>
              message.id === assistantId
                ? { ...message, text: message.text + chatEvent.delta }
                : message
            )
          );
        if (chatEvent.type === "chat.action") setStatus(chatEvent.action.label);
        if (chatEvent.type === "chat.failed") streamError = chatEvent.message;
      });
      if (streamError) throw new Error(streamError);
      setStatus("Ready");
      setChats(await client.chats());
    } catch (error) {
      const message = errorMessage(error, "The coworker could not respond.");
      setMessages((current) =>
        current.map((entry) => (entry.id === assistantId ? { ...entry, text: message } : entry))
      );
      setStatus("Needs attention");
    } finally {
      setBusy(false);
      window.setTimeout(() => composerRef.current?.focus(), 0);
    }
  }

  function newChat() {
    setConversationId(null);
    setThreadId(null);
    setMessages([]);
    setStatus("Ready");
  }

  async function openChat(chat: CoworkerChatRecord) {
    const detail = await client.chat(chat.uuid);
    setProject(projects.find((item) => item.id === detail.projectUuid));
    setConversationId(detail.uuid);
    setThreadId(detail.codexThreadId);
    setMessages(
      detail.messages.map((message) => ({
        id: message.uuid,
        role: message.role,
        text: message.body
      }))
    );
  }

  return (
    <main className={`coworker-shell${drawerCollapsed ? " drawer-collapsed" : ""}${sidePanel ? " with-side-panel" : ""}${sidePanelOpen ? " side-panel-open" : ""}`}>
      <CoworkerActivityBar
        collapsed={drawerCollapsed}
        onCollapsedChange={setDrawerCollapsed}
        onOpenMessenger={onOpenMessenger}
        onProject={() => setProjectDialog("link")}
      />
      <CoworkerDrawer
        activeChatId={conversationId}
        chats={chats}
        onNewChat={newChat}
        onOpenChat={(chat) => void openChat(chat)}
        product={product}
        {...(logoSrc ? { logoSrc } : {})}
        collapsed={drawerCollapsed}
        onCollapsedChange={setDrawerCollapsed}
      />
      <section className="coworker-workspace">
        <header className="coworker-header">
          <div className="coworker-context">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="coworker-project-trigger" type="button">
                  <span>{project?.title ?? "No projects"}</span>
                  <ChevronDown size={15} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="coworker-project-menu">
                <DropdownMenuLabel>Projects</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {projects.length ? (
                  projects.map((item) => (
                    <DropdownMenuItem
                      key={item.id}
                      onSelect={() => {
                        setProject(item);
                        setConversationId(null);
                        setThreadId(null);
                        setMessages([]);
                        void client
                          .selectProject?.(item)
                          .then(async () => setChats(await client.chats()));
                      }}
                    >
                      <Check className={item.id === project?.id ? "visible" : "invisible"} />
                      <span>{item.title}</span>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem disabled>No linked projects</DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <span className={busy ? "coworker-status active" : "coworker-status"}>
              <i aria-hidden="true" />
              {status}
            </span>
            <button
              aria-label="Create project"
              onClick={() => setProjectDialog("create")}
              title="Create project"
              type="button"
            >
              <FolderPlus size={16} />
            </button>
            <button
              aria-label="Link folder"
              onClick={() => setProjectDialog("link")}
              title="Link folder"
              type="button"
            >
              <FolderSymlink size={16} />
            </button>
          </div>
        </header>
        <section className="coworker-thread" aria-live="polite">
          {!messages.length ? (
            <div className="coworker-welcome">
              <span>
                <Sparkles size={22} />
              </span>
              <h1>What are we working on?</h1>
              <p>
                I can inspect the selected project, explain the code, and help you plan the next
                change.
              </p>
              {!project ? (
                <div className="coworker-project-actions">
                  <Button onClick={() => setProjectDialog("create")} type="button">
                    <FolderPlus size={17} /> Create project
                  </Button>
                  <Button onClick={() => setProjectDialog("link")} type="button" variant="outline">
                    <FolderSymlink size={17} /> Link folder
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            messages.map((message, index) => {
              const isActiveAssistant =
                busy && message.role === "assistant" && index === messages.length - 1;
              return (
              <article
                className={`coworker-message ${message.role}${isActiveAssistant ? " streaming" : ""}`}
                key={message.id}
              >
                {message.role === "assistant" ? (
                  <span className="coworker-avatar">
                    <Sparkles size={15} />
                  </span>
                ) : null}
                <div>
                  {message.role === "assistant" ? (
                    message.text ? (
                      <div className="coworker-response">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.text}</ReactMarkdown>
                        {isActiveAssistant ? <span className="coworker-stream-caret" /> : null}
                      </div>
                    ) : (
                      <ThinkingIndicator />
                    )
                  ) : (
                    <p>{message.text}</p>
                  )}
                </div>
              </article>
              );
            })
          )}
          <div ref={endRef} />
        </section>
        <form className="coworker-composer" onSubmit={send}>
          <Textarea
            aria-label="Message your coworker"
            disabled={busy || !project}
            onChange={(event) => {
              setComposer(event.target.value);
              resizeComposer(event.currentTarget);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={project ? `Ask about ${project.title}` : "Add a project to begin"}
            ref={composerRef}
            rows={3}
            value={composer}
          />
          <footer>
            <div>
              <button aria-label="Add emoji" title="Emoji support is coming next" type="button">
                <Smile size={18} />
              </button>
              <button aria-label="Attach a file" title="Attachments are coming next" type="button">
                <Paperclip size={18} />
              </button>
              <button aria-label="Use voice input" title="Voice input is coming next" type="button">
                <Mic size={18} />
              </button>
            </div>
            <button disabled={!composer.trim() || busy || !project} type="submit">
              <SendHorizontal size={16} /> Send
            </button>
          </footer>
        </form>
        {projectDialog ? (
          <ProjectDialog
            mode={projectDialog}
            onClose={() => setProjectDialog(null)}
            onConnect={async (name) => {
              const connector = projectDialog === "create" ? onCreateProject : onLinkProject;
              const linked = connector
                ? await connector(name)
                : await connectBrowserFolder(projectDialog, name);
              if (!linked) return;
              await client.selectProject?.(linked);
              setProjects((current) => [
                linked,
                ...current.filter((item) => item.id !== linked.id)
              ]);
              setProject(linked);
              setStatus("Ready");
              setProjectDialog(null);
            }}
          />
        ) : null}
      </section>
      {sidePanel ? (
        <aside aria-hidden={!sidePanelOpen} className="coworker-side-panel">
          {sidePanel}
        </aside>
      ) : null}
      {sidePanel && onToggleSidePanel ? (
        <nav className="coworker-right-activity" aria-label="Connection settings">
          <button
            aria-current={sidePanelOpen ? "page" : undefined}
            aria-label={sidePanelOpen ? "Hide connection settings" : "Show connection settings"}
            onClick={onToggleSidePanel}
            title={sidePanelOpen ? "Hide connection settings" : "Show connection settings"}
            type="button"
          >
            {sidePanelOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
          </button>
        </nav>
      ) : null}
    </main>
  );
}

function CoworkerActivityBar({ collapsed, onCollapsedChange, onOpenMessenger, onProject }: { collapsed: boolean; onCollapsedChange: (collapsed: boolean) => void; onOpenMessenger?: (() => void) | undefined; onProject: () => void }) {
  return (
    <nav className="coworker-activity" aria-label="Workspace navigation">
      <div className="activity-header"><button aria-label={collapsed ? "Open sidebar" : "Collapse sidebar"} onClick={() => onCollapsedChange(!collapsed)} title={`${collapsed ? "Open" : "Collapse"} sidebar (Ctrl+B)`} type="button"><Menu size={20} /></button></div>
      {onOpenMessenger ? <button aria-label="Messenger" onClick={onOpenMessenger} title="Messenger" type="button"><MessageCircle size={18} /></button> : null}
      <button aria-current="page" aria-label="AI Chat" title="AI Chat" type="button"><Sparkles size={18} /></button>
      <button aria-label="Projects" onClick={onProject} title="Projects" type="button"><FolderPlus size={18} /></button>
    </nav>
  );
}

function ThinkingIndicator() {
  return (
    <div className="coworker-thinking" role="status">
      <span>Thinking</span>
      <i aria-hidden="true" />
      <i aria-hidden="true" />
      <i aria-hidden="true" />
    </div>
  );
}

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === "string") {
    try {
      const parsed = JSON.parse(error) as { error?: { message?: string }; message?: string };
      return parsed.error?.message || parsed.message || fallback;
    } catch {
      return error.trim() || fallback;
    }
  }
  if (error && typeof error === "object" && "message" in error) {
    const message = String((error as { message: unknown }).message).trim();
    return message || fallback;
  }
  return fallback;
}

function ProjectDialog({
  mode,
  onClose,
  onConnect
}: {
  mode: "create" | "link";
  onClose: () => void;
  onConnect: (name?: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="coworker-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <form
        aria-labelledby="project-dialog-title"
        className="coworker-dialog"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          setBusy(true);
          void onConnect(mode === "create" ? name.trim() : undefined).finally(() => setBusy(false));
        }}
      >
        <span>
          <FolderPlus size={18} />
        </span>
        <h2 id="project-dialog-title">
          {mode === "create" ? "Create a project" : "Link a project folder"}
        </h2>
        <p>
          {mode === "create"
            ? "Choose a parent folder and DevKit will create the project directory."
            : "Choose an existing folder to use as your DevKit workspace."}
        </p>
        {mode === "create" ? (
          <label>
            Project name
            <Input
              autoFocus
              onChange={(event) => setName(event.target.value)}
              placeholder="my-project"
              value={name}
            />
          </label>
        ) : null}
        <footer>
          <Button onClick={onClose} type="button" variant="outline">
            Cancel
          </Button>
          <Button disabled={busy || (mode === "create" && !name.trim())} type="submit">
            {busy ? "Opening…" : mode === "create" ? "Choose location" : "Choose folder"}
          </Button>
        </footer>
      </form>
    </div>
  );
}

async function connectBrowserFolder(mode: "create" | "link", name?: string) {
  const picker = (
    window as typeof window & { showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle> }
  ).showDirectoryPicker;
  if (!picker)
    throw new Error("Folder access is available in the DevKit desktop app or a supported browser.");
  const parent = await picker();
  const directory =
    mode === "create" && name ? await parent.getDirectoryHandle(name, { create: true }) : parent;
  const title = directory.name;
  return {
    description: "Local workspace",
    id: `local:${title}`,
    key: title,
    moduleKey: "local",
    referenceId: title,
    referenceType: "folder",
    title
  };
}

function resizeComposer(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return;
  const maximumHeight = 180;
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(textarea.scrollHeight, maximumHeight)}px`;
  textarea.style.overflowY = textarea.scrollHeight > maximumHeight ? "auto" : "hidden";
}

async function resumeLatest(
  client: CoworkerBackend,
  project: CoworkerProject,
  chats: CoworkerChatRecord[],
  setMessages: (messages: CoworkerMessage[]) => void,
  setConversationId: (id: string) => void,
  setThreadId: (id: string | null) => void
) {
  const latest = chats.find((chat) => chat.projectUuid === project.id);
  if (!latest) return;
  const detail = await client.chat(latest.uuid);
  setConversationId(detail.uuid);
  setThreadId(detail.codexThreadId);
  setMessages(
    detail.messages.map((message) => ({ id: message.uuid, role: message.role, text: message.body }))
  );
}

function CoworkerLogin({
  client,
  onLogin,
  product
}: {
  client: CoworkerBackend;
  onLogin: (token: string) => void;
  product: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      onLogin((await client.login(email.trim(), password)).accessToken);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="coworker-login">
      <form onSubmit={submit}>
        <span>
          <Sparkles size={20} />
        </span>
        <h1>Your coworker, on this machine.</h1>
        <p>Sign in to connect {product} with the same conversations used on web and mobile.</p>
        <label>
          Email
          <Input
            autoComplete="email"
            autoFocus
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            value={email}
          />
        </label>
        <label>
          Password
          <Input
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            value={password}
          />
        </label>
        {error ? <div role="alert">{error}</div> : null}
        <button disabled={busy || !email.trim() || !password} type="submit">
          {busy ? "Connecting…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
