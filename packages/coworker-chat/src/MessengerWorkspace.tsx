import { FolderOpen, FolderPlus, GitBranch, Hash, Plus, SendHorizontal, Users, X } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { ComposerSymbolButtons, ComposerSymbolHelp, ComposerSuggestions, useComposerSymbols } from "./composer-symbols";
import type { MessengerActivity, MessengerClientKind, MessengerContact, MessengerMessage } from "./messenger-client";
import type { CoworkerProject } from "./types";
import type { CoworkerClient } from "./client";
import type { CoworkerRepository } from "./types";

export function MessengerDeviceWorkspace({
  contacts,
  error,
  messages,
  onRefresh,
  onSend,
  peerActorId,
  profileId,
  sending,
  syncing
}: {
  contacts: MessengerContact[];
  error: string;
  messages: MessengerMessage[];
  onRefresh: () => Promise<void>;
  onSend: (body: string) => Promise<boolean>;
  peerActorId: string;
  profileId: string;
  sending: boolean;
  syncing: boolean;
}) {
  const [body, setBody] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const tags = messageTags(messages);
  const symbols = useComposerSymbols({ inputRef: composerRef, onChange: setBody, tags, value: body });
  const visibleMessages = activeTag ? messages.filter((message) => messageTags([message]).includes(activeTag)) : messages;

  useEffect(() => {
    composerRef.current?.focus();
  }, []);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => setActiveTag(""), [peerActorId]);

  async function submitMessage(event: FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if (!text || sending) return;
    const filterTag = /^\/filter\s+#([\w.-]+)$/iu.exec(text)?.[1];
    if (filterTag) {
      setActiveTag(filterTag.toLocaleLowerCase());
      setBody("");
      return;
    }
    if (text === "/clear-filter") {
      setActiveTag("");
      setBody("");
      return;
    }
    if (await onSend(text)) setBody("");
    composerRef.current?.focus();
  }

  return (
    <section className="messenger-device-space">
      <section className="messenger-thread" aria-live="polite">
        {activeTag ? <div className="messenger-tag-filter"><Hash size={14} /><span>Showing #{activeTag}</span><button onClick={() => setActiveTag("")} type="button">Clear</button></div> : null}
        {visibleMessages.length ? (
          visibleMessages.map((message) => (
            <article
              className={`messenger-message${message.actorId === profileId ? " own" : ""}`}
              key={message.uuid}
            >
              {message.actorId !== profileId ? (
                <span className="messenger-avatar">
                  <Users size={15} />
                </span>
              ) : null}
              <div>
                <small>{message.actorId === profileId || !peerActorId ? clientLabel(message.client) : contacts.find((contact) => contact.uuid === message.actorId)?.name ?? "User"}</small>
                <MessageBody body={message.body} onTagClick={setActiveTag} />
                <time>
                  {new Date(message.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                  {message.actorId === profileId ? ` · ${message.readAt ? "Read" : message.deliveredAt ? "Delivered" : "Sent"}` : ""}
                </time>
              </div>
            </article>
          ))
        ) : messages.length && activeTag ? <div className="messenger-empty"><Hash size={24} /><h1>No #{activeTag} messages</h1><p>Clear the filter or use this tag in a new message.</p></div> : (
          <div className="messenger-empty">
            <Users size={24} />
            <h1>{peerActorId ? "Private conversation" : "Your private device chat"}</h1>
            <p>{peerActorId ? "Only you and this user can read these messages." : "Messages appear instantly on your web, desktop, and mobile sessions."}</p>
          </div>
        )}
        <div ref={endRef} />
      </section>
      {error ? (
        <p className="messenger-feedback" role="status">
          {error}
          <button disabled={syncing} onClick={() => void onRefresh()} type="button">
            {syncing ? "Refreshing…" : "Refresh"}
          </button>
        </p>
      ) : null}
      <form className="messenger-composer" onSubmit={submitMessage}>
        {symbols.trigger ? <ComposerSuggestions onPick={symbols.insert} onSelect={symbols.setSelectedIndex} selectedIndex={symbols.selectedIndex} suggestions={symbols.suggestions} symbol={symbols.trigger.kind} /> : null}
        <textarea
          aria-label={peerActorId ? "Message this user" : "Message your devices"}
          disabled={sending}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (symbols.onKeyDown(event)) return;
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={peerActorId ? "Write a private message" : "Message web, desktop, and mobile"}
          ref={composerRef}
          rows={2}
          value={body}
        />
        <footer>
          <div><ComposerSymbolButtons insert={symbols.insert} /><ComposerSymbolHelp /></div>
          <button disabled={!body.trim() || sending} type="submit">
            <SendHorizontal size={17} />
          </button>
        </footer>
      </form>
    </section>
  );
}

export function MessengerActivityPanel({ activity }: { activity: MessengerActivity[] }) {
  return (
    <section className="messenger-drawer-activity" aria-label="Conversation activity">
      <strong>Activity</strong>
      <div>
        {activity.map((item) => (
          <article key={item.id}>
            <i />
            <span>
              <b>{activityLabel(item.action)}</b>
              <small>{new Date(item.createdAt).toLocaleString()}</small>
            </span>
          </article>
        ))}
        {!activity.length ? <p>No stored activity yet.</p> : null}
      </div>
    </section>
  );
}

function activityLabel(action: string) {
  return ({ "conversation-created": "Conversation created", "message-sent": "Message sent", "messages-read": "Messages read", "preferences-updated": "Conversation preferences changed" } as Record<string, string>)[action] ?? action;
}

function MessageBody({ body, onTagClick }: { body: string; onTagClick: (tag: string) => void }) {
  const parts = body.split(/([@#][\w.-]+)/gu);
  return <p>{parts.map((part, index) => part.startsWith("#") ? <button className="message-tag" key={`${part}-${index}`} onClick={() => onTagClick(part.slice(1).toLocaleLowerCase())} type="button">{part}</button> : part.startsWith("@") ? <span className="message-mention" key={`${part}-${index}`}>{part}</span> : part)}</p>;
}

function messageTags(messages: MessengerMessage[]) {
  return [...new Set(messages.flatMap((message) => [...message.body.matchAll(/#([\w.-]+)/gu)].map((match) => match[1]!.toLocaleLowerCase())))].sort();
}

export function ProjectSpace({
  client,
  onCreated,
  onOpen,
  projects
}: {
  client: CoworkerClient;
  onCreated: (project: CoworkerProject) => void;
  onOpen: (project: CoworkerProject) => void;
  projects: CoworkerProject[];
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [logoText, setLogoText] = useState("");
  const [colorKey, setColorKey] = useState("slate");
  const [folder, setFolder] = useState("");
  const [repositories, setRepositories] = useState<CoworkerRepository[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!adding) return;
    void client.repositories().then(setRepositories).catch((reason) => setError(messageOf(reason)));
  }, [adding, client]);

  async function createProject(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const project = await client.createProject({ colorKey, key: projectKey, logoText, referenceId: folder, repositoryName: folder ? folderName(folder) : "", title: name.trim() });
      onCreated(project);
      setName("");
      setProjectKey("");
      setLogoText("");
      setFolder("");
      setAdding(false);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }

  async function chooseFolder() {
    setBusy(true);
    setError("");
    try {
      const result = await client.selectLocalFolder();
      setFolder(result.path);
      if (!name.trim()) setName(folderName(result.path));
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }

  async function connectRepository(repository: CoworkerRepository) {
    setBusy(true);
    setError("");
    try {
      const project = await client.createProject({ description: `${repository.provider === "github" ? "GitHub" : "Private Git"} repository`, repositoryName: repository.name, title: repository.name });
      onCreated(project);
      setAdding(false);
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="messenger-project-space">
      <header>
        <div>
          <h1>Projects</h1>
          <p>Connected repository workspaces available on mobile, desktop, and web.</p>
        </div>
        <div className="project-space-actions"><strong>{projects.length} connected</strong><button aria-label="Add project or repository" onClick={() => setAdding((open) => !open)} type="button">{adding ? <X size={17} /> : <Plus size={18} />}</button></div>
      </header>
      {adding ? <section className="project-create-panel"><form onSubmit={(event) => void createProject(event)}><label><span>Project name</span><input autoFocus aria-label="Project name" onChange={(event) => setName(event.target.value)} placeholder="New project name" value={name} /></label><label><span>Project no.</span><input aria-label="Project number" onChange={(event) => setProjectKey(event.target.value)} placeholder="PRJ-0008" value={projectKey} /></label><label><span>Icon</span><input aria-label="Project icon text" maxLength={4} onChange={(event) => setLogoText(event.target.value.toUpperCase())} placeholder="PX" value={logoText} /></label><label><span>Colour</span><select aria-label="Project colour" onChange={(event) => setColorKey(event.target.value)} value={colorKey}>{["slate", "violet", "amber", "blue", "emerald", "rose", "indigo"].map((color) => <option key={color} value={color}>{color[0]!.toUpperCase() + color.slice(1)}</option>)}</select></label><label className="project-folder-field"><span>Desktop folder</span><div><input aria-label="Desktop project folder" placeholder="Choose a local project folder" readOnly value={folder} /><button disabled={busy} onClick={() => void chooseFolder()} type="button"><FolderOpen size={15} /> Browse</button></div></label><footer><button disabled={busy || !name.trim()} type="submit">Create project</button></footer></form><div className="project-repository-options"><span>Or connect repository</span>{repositories.filter((repository) => !projects.some((project) => project.repositoryName === repository.name)).map((repository) => <button disabled={busy} key={repository.id} onClick={() => void connectRepository(repository)} type="button"><GitBranch size={14} />{repository.name}</button>)}</div>{error ? <p role="alert">{error}</p> : null}</section> : null}
      <div className="messenger-project-grid">
        {projects.map((project) => (
          <button key={project.id} onClick={() => onOpen(project)} type="button">
            <span className="messenger-project-icon">
              <FolderPlus size={18} />
            </span>
            <span className="messenger-project-copy">
              <strong>{project.title}</strong>
              <small>{plainText(project.description) || "Connected development workspace"}</small>
              <span className="messenger-project-meta">
                <span>
                  <GitBranch size={13} /> {project.repositoryName || project.key}
                </span>
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

function messageOf(reason: unknown) {
  return reason instanceof Error ? reason.message : "The project could not be created.";
}

function folderName(value: string) {
  return value.replace(/\\+$/u, "").split(/[\\/]/u).filter(Boolean).at(-1) ?? "";
}

function clientLabel(client: MessengerClientKind) {
  return client[0]!.toUpperCase() + client.slice(1);
}

function plainText(value: string) {
  return value
    .replace(/<[^>]*>/gu, " ")
    .replace(/&nbsp;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/\s+/gu, " ")
    .trim();
}
