import { ArrowDown, Check, CheckCheck, ChevronDown, Copy, Download, FileText, FolderOpen, Forward, GitBranch, Hash, Info, Paperclip, Plus, Reply, SendHorizontal, Smile, Users, X } from "lucide-react";
import { Fragment, type FormEvent, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ComposerSymbolButtons, ComposerSymbolHelp, ComposerSuggestions, useComposerSymbols } from "./composer-symbols";
import { isMessengerMessageOwn, type MessengerActivity, type MessengerAttachment, type MessengerClientKind, type MessengerContact, type MessengerMessage } from "./messenger-client";
import type { CoworkerProject, CoworkerProjectRecord } from "./types";
import type { CoworkerClient } from "./client";
import type { CoworkerRepository } from "./types";
import { belongsToProgressProject, ProjectProgress, projectProgress } from "./ProjectProgress";

export function MessengerDeviceWorkspace({
  attachmentBlob,
  clientKind,
  contacts,
  error,
  hasOlder,
  loadingOlder,
  messages,
  onLoadOlder,
  onRefresh,
  onReact,
  onSend,
  peerActorId,
  profileId,
  sending,
  syncing
}: {
  attachmentBlob: (attachment: MessengerAttachment) => Promise<Blob>;
  clientKind: MessengerClientKind;
  contacts: MessengerContact[];
  error: string;
  hasOlder: boolean;
  loadingOlder: boolean;
  messages: MessengerMessage[];
  onLoadOlder: () => Promise<boolean>;
  onRefresh: () => Promise<void>;
  onReact: (messageId: string, emoji: string) => Promise<void>;
  onSend: (body: string, files?: File[]) => Promise<boolean>;
  peerActorId: string;
  profileId: string;
  sending: boolean;
  syncing: boolean;
}) {
  const [body, setBody] = useState("");
  const [activeTag, setActiveTag] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [messageMenuId, setMessageMenuId] = useState("");
  const [messageInfoId, setMessageInfoId] = useState("");
  const [replyTo, setReplyTo] = useState<MessengerMessage | null>(null);
  const [newMessagesWaiting, setNewMessagesWaiting] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [fileError, setFileError] = useState("");
  const [lightbox, setLightbox] = useState<{ name: string; url: string } | null>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLElement>(null);
  const atBottomRef = useRef(true);
  const previousLastIdRef = useRef("");
  const previousPeerRef = useRef(peerActorId);
  const dragDepthRef = useRef(0);
  const tags = messageTags(messages);
  const symbols = useComposerSymbols({ inputRef: composerRef, onChange: setBody, tags, value: body });
  const visibleMessages = activeTag ? messages.filter((message) => messageTags([message]).includes(activeTag)) : messages;

  useEffect(() => {
    composerRef.current?.focus();
  }, []);
  useLayoutEffect(() => {
    const thread = threadRef.current;
    if (!thread) return;
    const last = messages.at(-1);
    const changedConversation = previousPeerRef.current !== peerActorId;
    const newLastMessage = Boolean(last && last.uuid !== previousLastIdRef.current);
    const ownLastMessage = Boolean(last && isMessengerMessageOwn(last, clientKind, profileId, peerActorId));
    if (changedConversation || (!previousLastIdRef.current && messages.length) || (newLastMessage && (atBottomRef.current || ownLastMessage))) {
      thread.scrollTop = thread.scrollHeight;
      atBottomRef.current = true;
      setNewMessagesWaiting(false);
      setShowScrollToBottom(false);
    } else if (newLastMessage && !atBottomRef.current) {
      setNewMessagesWaiting(true);
    }
    previousPeerRef.current = peerActorId;
    previousLastIdRef.current = last?.uuid ?? "";
  }, [clientKind, messages, peerActorId, profileId]);
  useEffect(() => setActiveTag(""), [peerActorId]);
  useEffect(() => {
    if (!messageMenuId) return;
    const close = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof PointerEvent && event.target instanceof Element && event.target.closest(".message-action-menu, .message-chevron")) return;
      setMessageMenuId("");
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, [messageMenuId]);
  useEffect(() => {
    if (!lightbox) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setLightbox(null); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [lightbox]);

  function addFiles(incoming: File[]) {
    const accepted = incoming.filter((file) => (file.type.startsWith("image/") || file.type === "application/pdf" || file.type === "text/plain" || /\.(?:pdf|txt)$/iu.test(file.name)) && file.size <= 2 * 1024 * 1024);
    setFileError(accepted.length === incoming.length && files.length + accepted.length <= 4 ? "" : "Attach up to 4 images, PDF, or text files of 2 MB each.");
    setFiles((current) => [...current, ...accepted].slice(0, 4));
  }

  async function submitMessage(event: FormEvent) {
    event.preventDefault();
    const text = body.trim();
    if ((!text && !files.length) || sending) return;
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
    const outgoing = replyTo ? `> ${replyTo.body.replace(/\n/gu, " ").slice(0, 120)}\n${text}` : text;
    if (await onSend(outgoing, files)) {
      setBody("");
      setFiles([]);
      setReplyTo(null);
    }
    composerRef.current?.focus();
  }

  async function loadOlderMessages() {
    const thread = threadRef.current;
    if (!thread) return;
    const previousHeight = thread.scrollHeight;
    const previousTop = thread.scrollTop;
    if (!(await onLoadOlder())) return;
    requestAnimationFrame(() => {
      thread.scrollTop = previousTop + thread.scrollHeight - previousHeight;
    });
  }

  return (
    <section
      className={`messenger-device-space${dragActive ? " drag-active" : ""}`}
      onDragEnter={(event) => { event.preventDefault(); dragDepthRef.current += 1; setDragActive(true); }}
      onDragLeave={(event) => { event.preventDefault(); dragDepthRef.current -= 1; if (dragDepthRef.current <= 0) { dragDepthRef.current = 0; setDragActive(false); } }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => { event.preventDefault(); dragDepthRef.current = 0; setDragActive(false); addFiles([...event.dataTransfer.files]); }}
    >
      {dragActive ? <div className="messenger-drop-overlay"><Paperclip size={25} /><strong>Drop files to attach</strong><small>Images, PDF, or text · 2 MB each</small></div> : null}
      <section
        className="messenger-thread"
        aria-live="polite"
        onScroll={(event) => {
          const thread = event.currentTarget;
          const atBottom = thread.scrollHeight - thread.scrollTop - thread.clientHeight < 80;
          atBottomRef.current = atBottom;
          setShowScrollToBottom(!atBottom);
          if (atBottom) setNewMessagesWaiting(false);
        }}
        ref={threadRef}
      >
        {hasOlder ? <button className="messenger-load-older" disabled={loadingOlder} onClick={() => void loadOlderMessages()} type="button">{loadingOlder ? "Loading…" : "Load older messages"}</button> : null}
        {activeTag ? <div className="messenger-tag-filter"><Hash size={14} /><span>Showing #{activeTag}</span><button onClick={() => setActiveTag("")} type="button">Clear</button></div> : null}
        {visibleMessages.length ? (
          visibleMessages.map((message, index) => {
            const own = isMessengerMessageOwn(message, clientKind, profileId, peerActorId);
            const showDate = index === 0 || messageDay(visibleMessages[index - 1]!.createdAt) !== messageDay(message.createdAt);
            return (
            <Fragment key={message.uuid}>
            {showDate ? <div className="messenger-date-separator"><span>{formatMessageDate(message.createdAt)}</span></div> : null}
            <article className={`messenger-message${own ? " own" : ""}`}>
              {!own ? (
                <span className="messenger-avatar">
                  <Users size={15} />
                </span>
              ) : null}
              <div>
                <button aria-expanded={messageMenuId === message.uuid} aria-label="Message actions" className="message-chevron" onClick={() => setMessageMenuId((current) => current === message.uuid ? "" : message.uuid)} type="button"><ChevronDown size={15} /></button>
                {messageMenuId === message.uuid ? <MessageActionMenu
                  message={message}
                  onClose={() => setMessageMenuId("")}
                  onForward={() => { setBody(message.body); composerRef.current?.focus(); setMessageMenuId(""); }}
                  onInfo={() => { setMessageInfoId(messageInfoId === message.uuid ? "" : message.uuid); setMessageMenuId(""); }}
                  onReact={(emoji) => { void onReact(message.uuid, emoji); setMessageMenuId(""); }}
                  onReply={() => { setReplyTo(message); composerRef.current?.focus(); setMessageMenuId(""); }}
                /> : null}
                <button className="messenger-reaction-trigger" aria-label="React to message" type="button"><Smile size={15} /><span>{["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => <b key={emoji} onClick={() => void onReact(message.uuid, emoji)}>{emoji}</b>)}</span></button>
                <button aria-label="Forward message" className="message-forward-trigger" onClick={() => { setBody(message.body); composerRef.current?.focus(); }} type="button"><Forward size={15} /></button>
                <small>{peerActorId ? (own ? "You" : contacts.find((contact) => contact.uuid === message.actorId)?.name ?? "User") : `${own ? "You · " : ""}${clientLabel(message.client)}`}</small>
                {message.attachments?.map((attachment) => <MessengerAttachmentView attachment={attachment} attachmentBlob={attachmentBlob} key={attachment.id} onOpen={(url) => setLightbox({ name: attachment.name, url })} />)}
                <MessageBody body={message.body} onTagClick={setActiveTag} />
                <time>
                  <span>{formatMessageTimestamp(message.createdAt)}</span>
                  {own ? <Receipt read={Boolean(message.readAt)} received={Boolean(message.deliveredAt)} /> : null}
                </time>
                {messageInfoId === message.uuid ? <div className="message-info"><Info size={13} /><span>Sent {new Date(message.createdAt).toLocaleString()}{message.deliveredAt ? ` · Received ${new Date(message.deliveredAt).toLocaleTimeString()}` : ""}{message.readAt ? ` · Read ${new Date(message.readAt).toLocaleTimeString()}` : ""}</span></div> : null}
                {message.reactions?.length ? <div className="messenger-reactions">{message.reactions.map((reaction) => <button key={reaction.id} onClick={() => void onReact(message.uuid, reaction.emoji)} type="button">{reaction.emoji}</button>)}</div> : null}
              </div>
            </article>
            </Fragment>
          );})
        ) : messages.length && activeTag ? <div className="messenger-empty"><Hash size={24} /><h1>No #{activeTag} messages</h1><p>Clear the filter or use this tag in a new message.</p></div> : (
          <div className="messenger-empty">
            <Users size={24} />
            <h1>{peerActorId ? "Private conversation" : "Your private device chat"}</h1>
            <p>{peerActorId ? "Only you and this user can read these messages." : "Messages appear instantly on your web, desktop, and mobile sessions."}</p>
          </div>
        )}
        {showScrollToBottom ? <button aria-label="Scroll to latest messages" className="messenger-new-messages" onClick={() => { const thread = threadRef.current; if (thread) thread.scrollTo({ behavior: "smooth", top: thread.scrollHeight }); setNewMessagesWaiting(false); setShowScrollToBottom(false); }} type="button"><ArrowDown size={17} />{newMessagesWaiting ? <i /> : null}</button> : null}
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
        {replyTo ? <div className="messenger-reply-preview"><Reply size={14} /><span><b>Replying to {clientLabel(replyTo.client)}</b><small>{replyTo.body}</small></span><button aria-label="Cancel reply" onClick={() => setReplyTo(null)} type="button"><X size={14} /></button></div> : null}
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
        {files.length ? <div className="messenger-attachment-preview">{files.map((file) => <PendingAttachment file={file} key={`${file.name}-${file.size}`} onRemove={() => setFiles((current) => current.filter((item) => item !== file))} />)}</div> : null}
        {fileError ? <small className="messenger-file-error" role="alert">{fileError}</small> : null}
        <footer>
          <div><label className="messenger-attach-button" title="Attach image or file"><Paperclip size={16} /><input accept="image/*,.pdf,.txt" multiple onChange={(event) => { addFiles([...event.target.files ?? []]); event.currentTarget.value = ""; }} type="file" /></label><ComposerSymbolButtons insert={symbols.insert} /><ComposerSymbolHelp /></div>
          <button disabled={(!body.trim() && !files.length) || sending} type="submit">
            <SendHorizontal size={17} />
          </button>
        </footer>
      </form>
      {lightbox ? <div aria-label={`Preview ${lightbox.name}`} aria-modal="true" className="messenger-lightbox" onClick={() => setLightbox(null)} role="dialog"><button aria-label="Close preview" onClick={() => setLightbox(null)} type="button"><X size={20} /></button><img alt={lightbox.name} onClick={(event) => event.stopPropagation()} src={lightbox.url} /></div> : null}
    </section>
  );
}

function MessageActionMenu({ message, onClose, onForward, onInfo, onReact, onReply }: {
  message: MessengerMessage;
  onClose: () => void;
  onForward: () => void;
  onInfo: () => void;
  onReact: (emoji: string) => void;
  onReply: () => void;
}) {
  return <div className="message-action-menu" role="menu">
    <div>{["👍", "❤️", "😂", "😮", "😢", "🙏"].map((emoji) => <button aria-label={`React ${emoji}`} key={emoji} onClick={() => onReact(emoji)} type="button">{emoji}</button>)}</div>
    <button onClick={onInfo} role="menuitem" type="button"><Info size={15} />Message info</button>
    <button onClick={onReply} role="menuitem" type="button"><Reply size={15} />Reply</button>
    <button onClick={() => { void navigator.clipboard.writeText(message.body); onClose(); }} role="menuitem" type="button"><Copy size={15} />Copy</button>
    <button onClick={onForward} role="menuitem" type="button"><Forward size={15} />Forward</button>
  </div>;
}

export function formatMessageTimestamp(value: string, now = Date.now()) {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = date.toLocaleString("en", { month: "short" });
  const time = date.toLocaleTimeString("en", { hour: "2-digit", hour12: true, minute: "2-digit" }).toLocaleLowerCase();
  const totalMinutes = Math.max(0, Math.floor((now - date.getTime()) / 60_000));
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;
  const ago = days ? `${days}d ${hours}h ago` : hours ? `${hours}h ${minutes}m ago` : `${minutes}m ago`;
  return `${day}-${month} - ${time} (${ago})`;
}

export function formatMessageDate(value: string, now = Date.now()) {
  const date = new Date(value);
  const today = new Date(now);
  if (messageDay(value) === messageDay(today.toISOString())) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (messageDay(value) === messageDay(yesterday.toISOString())) return "Yesterday";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function messageDay(value: string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function Receipt({ read, received }: { read: boolean; received: boolean }) {
  if (read) return <span aria-label="Read" className="message-receipt read"><CheckCheck size={15} /></span>;
  if (received) return <span aria-label="Received" className="message-receipt"><CheckCheck size={15} /></span>;
  return <span aria-label="Sent" className="message-receipt"><Check size={14} /></span>;
}

function MessengerAttachmentView({ attachment, attachmentBlob, onOpen }: { attachment: MessengerAttachment; attachmentBlob: (attachment: MessengerAttachment) => Promise<Blob>; onOpen: (url: string) => void }) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let disposed = false;
    let objectUrl = "";
    setFailed(false);
    void attachmentBlob(attachment)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (disposed) URL.revokeObjectURL(objectUrl);
        else setUrl(objectUrl);
      })
      .catch(() => {
        if (!disposed) setFailed(true);
      });
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment, attachmentBlob]);
  if (failed) return <span className="message-file loading">Attachment unavailable</span>;
  if (attachment.mimeType.startsWith("image/")) return url ? <button aria-label={`Preview ${attachment.name}`} className="message-image" onClick={() => onOpen(url)} type="button"><img alt={attachment.name} src={url} /></button> : <span className="message-file loading">Loading image…</span>;
  return <a className="message-file" download={attachment.name} href={url || undefined}><FileText size={18} /><span><b>{attachment.name}</b><small>{Math.ceil(attachment.size / 1024)} KB</small></span><Download size={16} /></a>;
}

function PendingAttachment({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!file.type.startsWith("image/")) return;
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return <span className={url ? "image" : ""}>{url ? <img alt="" src={url} /> : <FileText size={15} />}<b>{file.name}</b><button aria-label={`Remove ${file.name}`} onClick={onRemove} type="button"><X size={14} /></button></span>;
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
  const lines = body.split("\n");
  const quote = lines[0]?.startsWith("> ") ? lines.shift()!.slice(2) : "";
  const content = lines.join("\n");
  return <div className="message-body">{quote ? <blockquote>{quote}</blockquote> : null}<p>{messageParts(quote ? content : body, onTagClick)}</p></div>;
}

function messageParts(body: string, onTagClick: (tag: string) => void) {
  return body.split(/([@#][\w.-]+)/gu).map((part, index) => part.startsWith("#") ? <button className="message-tag" key={`${part}-${index}`} onClick={() => onTagClick(part.slice(1).toLocaleLowerCase())} type="button">{part}</button> : part.startsWith("@") ? <span className="message-mention" key={`${part}-${index}`}>{part}</span> : part);
}

function messageTags(messages: MessengerMessage[]) {
  return [...new Set(messages.flatMap((message) => [...message.body.matchAll(/#([\w.-]+)/gu)].map((match) => match[1]!.toLocaleLowerCase())))].sort();
}

export function ProjectSpace({
  client,
  clientKind,
  onCreated,
  onOpen,
  projects
}: {
  client: CoworkerClient;
  clientKind: MessengerClientKind;
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
  const [gitUrl, setGitUrl] = useState("");
  const [repositories, setRepositories] = useState<CoworkerRepository[]>([]);
  const [progressRecords, setProgressRecords] = useState<CoworkerProjectRecord[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const createPanelRef = useRef<HTMLElement>(null);
  const createToggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!adding) return;
    void client.repositories().then(setRepositories).catch((reason) => setError(messageOf(reason)));
  }, [adding, client]);
  useEffect(() => {
    if (!adding) return;
    const close = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof PointerEvent) {
        const target = event.target as Node;
        if (createPanelRef.current?.contains(target) || createToggleRef.current?.contains(target)) return;
      }
      setAdding(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, [adding]);
  useEffect(() => {
    void Promise.all(
      ["task", "activity", "review", "release"].map((kind) => client.projectRecords(kind))
    ).then((groups) => setProgressRecords(groups.flat())).catch(() => setProgressRecords([]));
  }, [client, projects]);

  async function createProject(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError("");
    try {
      const repositoryName = repositoryNameFromUrl(gitUrl) || (folder ? folderName(folder) : "");
      const project = await client.createProject({ colorKey, key: projectKey, logoText, referenceId: clientKind === "desktop" ? folder : "", repositoryName, repositoryUrl: gitUrl, title: name.trim() });
      onCreated(project);
      setName("");
      setProjectKey("");
      setLogoText("");
      setFolder("");
      setGitUrl("");
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
        <div className="project-space-actions"><strong>{projects.length} connected</strong><button aria-label="Add project or repository" onClick={() => setAdding((open) => !open)} ref={createToggleRef} type="button">{adding ? <X size={17} /> : <Plus size={18} />}</button></div>
      </header>
      {adding ? <section className="project-create-panel" ref={createPanelRef}><form onSubmit={(event) => void createProject(event)}><label><span>Project name</span><input autoFocus aria-label="Project name" onChange={(event) => setName(event.target.value)} placeholder="New project name" value={name} /></label><label><span>Project no.</span><input aria-label="Project number" onChange={(event) => setProjectKey(event.target.value)} placeholder="PRJ-0008" value={projectKey} /></label><label><span>Icon</span><input aria-label="Project icon text" maxLength={4} onChange={(event) => setLogoText(event.target.value.toUpperCase())} placeholder="PX" value={logoText} /></label><label><span>Colour</span><select aria-label="Project colour" onChange={(event) => setColorKey(event.target.value)} value={colorKey}>{["slate", "violet", "amber", "blue", "emerald", "rose", "indigo"].map((color) => <option key={color} value={color}>{color[0]!.toUpperCase() + color.slice(1)}</option>)}</select></label><label><span>Git repository URL</span><input aria-label="Git repository URL" inputMode="url" onChange={(event) => setGitUrl(event.target.value)} placeholder="https://github.com/owner/repository.git" value={gitUrl} /></label>{clientKind === "desktop" ? <label className="project-folder-field"><span>Desktop folder mapping</span><div><input aria-label="Desktop project folder mapping" placeholder="Choose a local project folder" readOnly value={folder} /><button disabled={busy} onClick={() => void chooseFolder()} type="button"><FolderOpen size={15} /> Browse</button></div></label> : null}<footer><button disabled={busy || !name.trim()} type="submit">Create project</button></footer></form><div className="project-repository-options"><span>Or connect repository</span>{repositories.filter((repository) => !projects.some((project) => project.repositoryName === repository.name)).map((repository) => <button disabled={busy} key={repository.id} onClick={() => void connectRepository(repository)} type="button"><GitBranch size={14} />{repository.name}</button>)}</div>{error ? <p role="alert">{error}</p> : null}</section> : null}
      <div className="messenger-project-grid">
        {projects.map((project) => (
          <button key={project.id} onClick={() => onOpen(project)} type="button">
            <span
              aria-hidden="true"
              className={`messenger-project-icon ${projectColor(project.colorKey)}`}
            >
              {projectLogo(project)}
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
            <ProjectProgress compact value={projectProgress(project, progressRecords.filter((record) => belongsToProgressProject(record, project)))} />
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

function repositoryNameFromUrl(value: string) {
  return value.trim().replace(/[\\/]+$/u, "").split(/[\\/:]/u).filter(Boolean).at(-1)?.replace(/\.git$/iu, "") ?? "";
}

function projectLogo(project: CoworkerProject) {
  const savedLogo = project.logoText?.trim();
  if (savedLogo) return savedLogo.toUpperCase();
  const words = project.title.split(/[^a-z0-9]+/iu).filter(Boolean);
  if (words.length > 1) return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return project.title.replace(/[^a-z0-9]/giu, "").slice(0, 2).toUpperCase() || "PR";
}

function projectColor(colorKey: string | undefined) {
  return ["violet", "amber", "blue", "emerald", "rose", "indigo"].includes(colorKey ?? "")
    ? colorKey
    : "slate";
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
