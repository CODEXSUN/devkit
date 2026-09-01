import { ArrowLeft, FileUp, HelpCircle, History, ListTodo, LockKeyhole, PanelRightClose, PanelRightOpen, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { WorkspaceEditor } from "@codexsun/ui/workspace";
import type { CoworkerClient } from "./client";
import type { CoworkerProject, CoworkerProjectAttachment, CoworkerProjectRecord } from "./types";

type DraftState = "idle" | "saved" | "saving" | "error";
type IdeaSnapshot = Pick<CoworkerProjectRecord, "description" | "title"> & { savedAt: string };
type EditorNoun = "architecture" | "change" | "idea" | "note" | "task";

export function ProjectIdeaEditor({ client, idea, noun = "idea", onBack, onSaved, project, recordKind = "discussion" }: {
  client: CoworkerClient; idea: CoworkerProjectRecord; onBack: () => void;
  noun?: EditorNoun; onSaved: (idea: CoworkerProjectRecord) => void;
  project?: CoworkerProject; recordKind?: "discussion" | "release" | "task";
}) {
  const [draft, setDraft] = useState(idea);
  const [draftState, setDraftState] = useState<DraftState>("idle");
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState<CoworkerProject[]>([]);
  const [globalIdeas, setGlobalIdeas] = useState<CoworkerProjectRecord[]>([]);
  const [attachments, setAttachments] = useState<CoworkerProjectAttachment[]>([]);
  const [attachmentPreviews, setAttachmentPreviews] = useState<Record<string, string>>({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<IdeaSnapshot[]>([]);
  const [taskState, setTaskState] = useState<"idle" | "creating" | "created" | "error">("idle");
  const [recordId, setRecordId] = useState(idea.id);
  const savingRef = useRef(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const editorHostRef = useRef<HTMLDivElement>(null);
  const propertiesRef = useRef<HTMLElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const escapeTimerRef = useRef<number | null>(null);
  const escapeArmedRef = useRef(false);
  const savedSignature = useRef(recordSignature(idea));
  const creating = recordId.startsWith("draft:");
  const supportsGlobalLink = noun === "idea";
  const tags = useMemo(() => hashtags(draft.description), [draft.description]);
  const linkedProject = project ?? projects.find((entry) => entry.id === draft.referenceId);

  useEffect(() => {
    setDraft(idea);
    setRecordId(idea.id);
    savedSignature.current = recordSignature(idea);
    const recovered = readRecovery(idea.id);
    if (recovered && recordSignature(recovered) !== recordSignature(idea)) setDraft(recovered);
  }, [idea]);
  useEffect(() => { void client.projects().then(setProjects).catch(() => setProjects([])); }, [client]);
  useEffect(() => { if (!supportsGlobalLink) return; void client.projectRecords("discussion").then((records) => setGlobalIdeas(records.filter((record) => !record.referenceId && record.id !== recordId))).catch(() => setGlobalIdeas([])); }, [client, recordId, supportsGlobalLink]);
  useEffect(() => {
    setSnapshots(readSnapshots(recordId));
    if (!creating && recordKind !== "release") void client.projectRecordAttachments(recordKind, recordId).then(setAttachments).catch(() => setAttachments([]));
    else setAttachments([]);
  }, [client, creating, recordId, recordKind]);
  useEffect(() => {
    let disposed = false;
    const previews: Record<string, string> = {};
    const images = attachments.filter((attachment) => attachment.mimeType.startsWith("image/"));
    void Promise.all(images.map(async (attachment) => [attachment.id, URL.createObjectURL(await client.downloadProjectRecordAttachment(recordKind, recordId, attachment.id))] as const))
      .then((entries) => {
        if (disposed) entries.forEach(([, url]) => URL.revokeObjectURL(url));
        else { entries.forEach(([id, url]) => { previews[id] = url; }); setAttachmentPreviews(previews); }
      })
      .catch(() => { if (!disposed) setAttachmentPreviews({}); });
    return () => { disposed = true; Object.values(previews).forEach((url) => URL.revokeObjectURL(url)); };
  }, [attachments, client, recordId, recordKind]);

  const persist = useCallback(async (current: CoworkerProjectRecord) => {
    if (savingRef.current || !hasDraftContent(current)) return null;
    savingRef.current = true;
    setDraftState("saving");
    setError("");
    const title = current.title.trim() || titleFromContent(current.description) || `Untitled ${noun}`;
    const payload = {
      assignee: current.assignee ?? "",
      description: current.description,
      key: current.key || recordKey(noun, title),
      lane: current.lane,
      referenceId: project?.id ?? current.referenceId,
      referenceType: project ? "project" : current.referenceId ? "project" : "",
      status: current.status === "draft" ? "open" : current.status || (creating ? "draft" : "open"),
      title,
      type: current.type || "general"
    };
    try {
      const saved = creating
        ? await client.createProjectRecord(recordKind, payload)
        : await client.updateProjectRecord(recordKind, recordId, payload);
      setDraft(saved);
      setRecordId(saved.id);
      savedSignature.current = recordSignature(saved);
      setSnapshots((current) => saveSnapshot(saved, current));
      clearRecovery(recordId);
      clearRecovery(saved.id);
      setDraftState("saved");
      return saved;
    } catch (reason) {
      saveRecovery(recordId, current);
      setDraftState("error");
      setError(reason instanceof Error ? reason.message : `The ${noun} could not be saved.`);
      return null;
    } finally {
      savingRef.current = false;
    }
  }, [client, creating, noun, project, recordId, recordKind]);

  useEffect(() => {
    if (recordSignature(draft) === savedSignature.current || !hasDraftContent(draft)) return;
    saveRecovery(recordId, draft);
    setDraftState("idle");
  }, [draft, recordId]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (historyOpen || shortcutOpen) {
        setHistoryOpen(false);
        setShortcutOpen(false);
        return;
      }
      const editable = document.activeElement;
      if (editable !== titleInputRef.current && !isIdeaEditable(editable, editorHostRef.current)) return;

      event.preventDefault();
      if (escapeArmedRef.current) {
        escapeArmedRef.current = false;
        if (escapeTimerRef.current) window.clearTimeout(escapeTimerRef.current);
        void returnToList();
        return;
      }

      selectEditableText(editable);
      escapeArmedRef.current = true;
      escapeTimerRef.current = window.setTimeout(() => { escapeArmedRef.current = false; }, 900);
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      if (escapeTimerRef.current) window.clearTimeout(escapeTimerRef.current);
    };
  }, [draft, historyOpen, persist, shortcutOpen]);

  useEffect(() => {
    const saveWithShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void persist(draft);
      }
    };
    window.addEventListener("keydown", saveWithShortcut);
    return () => window.removeEventListener("keydown", saveWithShortcut);
  }, [draft, persist]);

  function updateDescription(description: string) {
    setDraft((current) => ({
      ...current,
      description,
      title: current.title.trim() ? current.title : titleFromContent(description)
    }));
  }

  async function returnToList() {
    const changed = recordSignature(draft) !== savedSignature.current;
    if (changed) saveRecovery(recordId, draft);
    else if (!creating) onSaved(draft);
    onBack();
  }

  function focusEditor() {
    editorHostRef.current?.querySelector<HTMLElement>(".ProseMirror, textarea[aria-label='Markdown content'], textarea[aria-label='Raw HTML and CSS']")?.focus();
  }

  function focusProperties() {
    if (!drawerOpen) {
      setDrawerOpen(true);
      window.setTimeout(() => propertiesRef.current?.querySelector<HTMLElement>("select:not(:disabled), input:not(:disabled)")?.focus(), 0);
      return;
    }
    propertiesRef.current?.querySelector<HTMLElement>("select:not(:disabled), input:not(:disabled)")?.focus();
  }

  function handleEditorTab(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab") return;
    const target = event.target as HTMLElement;
    if (target === titleInputRef.current) {
      event.preventDefault();
      focusEditor();
      return;
    }
    if (!isIdeaEditable(target, editorHostRef.current)) return;
    event.preventDefault();
    if (event.shiftKey) titleInputRef.current?.focus();
    else focusProperties();
  }

  function handlePropertiesTab(event: React.KeyboardEvent<HTMLElement>) {
    if (event.key !== "Tab" || !event.shiftKey) return;
    const firstControl = propertiesRef.current?.querySelector<HTMLElement>("select:not(:disabled), input:not(:disabled)");
    if (event.target !== firstControl) return;
    event.preventDefault();
    focusEditor();
  }

  async function uploadAttachments(files: FileList) {
    const saved = await persist(draft);
    const targetId = saved?.id ?? recordId;
    if (targetId.startsWith("draft:")) { setError(`Save the ${noun} before attaching files.`); return; }
    const uploaded: CoworkerProjectAttachment[] = [];
    const failed: string[] = [];
    for (const file of Array.from(files)) {
      try { uploaded.push(await client.uploadProjectRecordAttachment(recordKind, targetId, file)); }
      catch (reason) { failed.push(`${file.name}: ${reason instanceof Error ? reason.message : "Upload failed."}`); }
    }
    if (uploaded.length) setAttachments((current) => [...current, ...uploaded]);
    setError(failed.join(" "));
  }

  async function removeAttachment(attachment: CoworkerProjectAttachment) {
    try {
      await client.deleteProjectRecordAttachment(recordKind, recordId, attachment.id);
      setAttachments((current) => current.filter((item) => item.id !== attachment.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The attachment could not be removed.");
    }
  }

  async function createTask() {
    if (taskState === "creating") return;
    setTaskState("creating");
    try {
      const saved = await persist(draft);
      const source = saved ?? draft;
      await client.createProjectRecord("task", {
        description: `Created from idea #${source.key || "IDEA"}.\n\n${source.description}`,
        key: taskKey(source.title), lane: "ideas", referenceId: project?.id ?? source.referenceId,
        referenceType: project || source.referenceId ? "project" : "", status: "open", title: source.title, type: "idea"
      });
      setTaskState("created");
    } catch (reason) {
      setTaskState("error");
      setError(reason instanceof Error ? reason.message : "The task could not be created.");
    }
  }

  return <section className={`project-idea-editor${drawerOpen ? " drawer-open" : ""}`}>
    <header>
      <button aria-label={`Back to ${recordListLabel(noun)}`} onClick={() => void returnToList()} title={`Back to ${recordListLabel(noun)}`} type="button"><ArrowLeft size={17} /></button>
      <strong>{draft.title.trim() || `Untitled ${noun}`}</strong>
      <div>
        {noun === "idea" ? <button className="idea-privacy-button" title="Idea visibility" type="button"><LockKeyhole size={15} /></button> : null}
        <button aria-expanded={historyOpen} aria-label="Local version history" onClick={() => setHistoryOpen((open) => !open)} title="Local version history" type="button"><History size={16} /></button>
        <button aria-expanded={shortcutOpen} aria-label="Keyboard shortcuts" onClick={() => setShortcutOpen((open) => !open)} title="Keyboard shortcuts" type="button"><HelpCircle size={16} /></button>
        <button aria-expanded={drawerOpen} aria-label={drawerOpen ? "Collapse properties" : "Open properties"} onClick={() => setDrawerOpen((open) => !open)} title={drawerOpen ? "Collapse properties" : "Open properties"} type="button">{drawerOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}</button>
        <button aria-label={saveStateLabel(draftState)} className={`idea-save-button ${draftState}`} disabled={savingRef.current} onClick={() => void persist(draft)} type="button"><i aria-hidden="true" />{saveStateLabel(draftState)}</button>
      </div>
    </header>
    <main onKeyDownCapture={handleEditorTab}>
      <input aria-label={`${title(noun)} title`} autoFocus onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder={`${title(noun)} title`} ref={titleInputRef} value={draft.title} />
      {historyOpen ? <section className="idea-floating-panel" aria-label="Local version history"><header><strong>Local history</strong><button aria-label="Close history" onClick={() => setHistoryOpen(false)} type="button"><X size={15} /></button></header>{snapshots.length ? snapshots.map((snapshot) => <button key={snapshot.savedAt} onClick={() => { setDraft((current) => ({ ...current, description: snapshot.description, title: snapshot.title })); setHistoryOpen(false); }} type="button"><strong>{snapshot.title || `Untitled ${noun}`}</strong><small>{new Date(snapshot.savedAt).toLocaleString()}</small></button>) : <p>Saved versions appear here on this device.</p>}</section> : null}
      {shortcutOpen ? <section className="idea-floating-panel idea-shortcut-panel" aria-label="Keyboard shortcuts"><header><strong>Keyboard shortcuts</strong><button aria-label="Close shortcuts" onClick={() => setShortcutOpen(false)} type="button"><X size={15} /></button></header><p><kbd>Ctrl</kbd> + <kbd>S</kbd> Save changes</p><p><kbd>Esc</kbd> Select title or editor text</p><p><kbd>Esc</kbd> <kbd>Esc</kbd> Return to {recordListLabel(noun)}</p></section> : null}
      <div ref={editorHostRef}><WorkspaceEditor content={draft.description} fullPreview onChange={updateDescription} placeholder={recordKind === "release" ? "Write the change message, impact, and important upgrade notes…" : "Explain the problem, proposal, trade-offs, and feedback you need…"} /></div>
      {recordKind !== "release" ? <div className="idea-editor-actions">
        <input accept="application/pdf,image/gif,image/jpeg,image/png,image/webp,text/plain" aria-label="Add attachments" hidden multiple onChange={(event) => { if (event.target.files?.length) void uploadAttachments(event.target.files); event.target.value = ""; }} ref={attachmentInputRef} type="file" />
        <button onClick={() => attachmentInputRef.current?.click()} type="button"><FileUp size={15} /> Attach files</button>
        {recordKind === "discussion" && noun !== "architecture" ? <button disabled={taskState === "creating" || taskState === "created"} onClick={() => void createTask()} type="button"><ListTodo size={15} /> {taskState === "creating" ? "Creating task…" : taskState === "created" ? "Task created" : "Create task"}</button> : null}
      </div> : null}
      {attachments.length ? <div className="idea-attachments">{attachments.map((attachment) => attachmentPreviews[attachment.id] ? <span className="idea-image-attachment" key={attachment.id}><img alt={attachment.originalName} src={attachmentPreviews[attachment.id]} /><button aria-label={`Remove ${attachment.originalName}`} onClick={() => void removeAttachment(attachment)} type="button"><X size={13} /></button></span> : <span key={attachment.id}>{attachment.originalName}<button aria-label={`Remove ${attachment.originalName}`} onClick={() => void removeAttachment(attachment)} type="button"><X size={13} /></button></span>)}</div> : null}
      {error ? <p role="alert">{error}</p> : null}
    </main>
    <aside aria-hidden={!drawerOpen} onKeyDownCapture={handlePropertiesTab} ref={propertiesRef}>
      <button aria-label="Collapse properties" onClick={() => setDrawerOpen(false)} title="Collapse properties" type="button"><PanelRightClose size={17} /></button>
      <IdeaField color="#2563eb" label={recordKind === "release" ? "Change type" : "Category"}><select aria-label={`${title(noun)} category`} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))} value={draft.type || "general"}>{recordKind === "release" ? <><option value="feature">Feature</option><option value="fix">Fix</option><option value="improvement">Improvement</option><option value="security">Security</option><option value="maintenance">Maintenance</option></> : <>{noun === "architecture" ? <option value="architecture">Architecture</option> : null}<option value="general">General</option><option value="product">Product</option><option value="engineering">Engineering</option><option value="design">Design</option><option value="research">Research</option></>}</select></IdeaField>
      <IdeaField color="#0891b2" label="Status"><select aria-label={`${title(noun)} status`} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))} value={draft.status || "draft"}>{recordKind === "release" ? <><option value="draft">Draft</option><option value="planned">Planned</option><option value="released">Released</option></> : <><option value="draft">Draft</option><option value="open">Open</option><option value="planning">Planning</option><option value="in-progress">In progress</option><option value="blocked">Blocked</option><option value="completed">Completed</option></>}</select></IdeaField>
      {recordKind === "release" ? <IdeaField label="Version"><input aria-label="Change version" onChange={(event) => setDraft((current) => ({ ...current, key: event.target.value }))} placeholder="v1.0.0" value={draft.key ?? ""} /></IdeaField> : null}
      <IdeaField label="Project"><select aria-label={`${title(noun)} project`} disabled={Boolean(project)} onChange={(event) => setDraft((current) => ({ ...current, referenceId: event.target.value }))} value={project?.id ?? linkedProject?.id ?? ""}><option value="">{supportsGlobalLink ? "Global idea" : "No project"}</option>{projects.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></IdeaField>
      <div className="idea-link-chips">{linkedProject ? <span>Project: {linkedProject.title}</span> : <span>Global idea</span>}{draft.lane.startsWith("global:") ? <span>Linked global idea</span> : null}</div>
      {linkedProject && supportsGlobalLink ? <IdeaField label="Global idea link"><select aria-label="Linked global idea" onChange={(event) => setDraft((current) => ({ ...current, lane: event.target.value ? `global:${event.target.value}` : "" }))} value={draft.lane.startsWith("global:") ? draft.lane.slice(7) : ""}><option value="">No global link</option>{globalIdeas.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></IdeaField> : null}
      <IdeaField label="Tags"><output>{tags.length ? tags.map((tag) => `#${tag}`).join(" ") : "Add #tags in the content"}</output></IdeaField>
      <IdeaField label="Assigned to"><input aria-label="Assigned user" onChange={(event) => setDraft((current) => ({ ...current, assignee: event.target.value }))} placeholder="Name or email" value={draft.assignee ?? ""} /></IdeaField>
    </aside>
  </section>;
}

function IdeaField({ children, color, label }: { children: ReactNode; color?: string; label: string }) { return <label className="project-idea-field"><span>{label}{color ? <i aria-hidden="true" style={{ background: color }} /> : null}</span>{children}</label>; }
function saveStateLabel(state: DraftState) { return state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Draft"; }
function title(value: string) { return value.replace(/^./u, (letter) => letter.toUpperCase()); }
function hasDraftContent(value: CoworkerProjectRecord) { return Boolean(value.title.trim() || plainText(value.description)); }
function hashtags(value: string) { return [...new Set([...value.matchAll(/#([a-z0-9-]{2,48})/giu)].map((match) => match[1]!.toLowerCase()))]; }
function ideaKey(title: string) { return `IDEA-${title.trim().replace(/[^a-z0-9]+/giu, "-").replace(/^-|-$/gu, "").slice(0, 32).toUpperCase() || "NEW"}`; }
function recordKey(noun: EditorNoun, value: string) { const stem = ideaKey(value).replace("IDEA-", ""); return `${noun === "architecture" ? "ARCH" : noun === "change" ? "CHANGE" : noun.toUpperCase()}-${stem}`; }
function recordListLabel(noun: EditorNoun) { return noun === "architecture" ? "architecture" : noun === "change" ? "changelog" : `${noun}s`; }
function taskKey(title: string) { return `${ideaKey(title).replace("IDEA-", "TASK-")}-${Date.now().toString(36).toUpperCase()}`; }
function plainText(value: string) { return value.replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ").trim(); }
function isIdeaEditable(element: Element | null, editorHost: HTMLElement | null) { return Boolean(element && editorHost?.contains(element) && (element instanceof HTMLTextAreaElement || element.getAttribute("contenteditable") === "true")); }
function selectEditableText(element: Element | null) {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) { element.select(); return; }
  if (!(element instanceof HTMLElement) || element.getAttribute("contenteditable") !== "true") return;
  const range = document.createRange();
  range.selectNodeContents(element);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}
function recordSignature(value: CoworkerProjectRecord) { return JSON.stringify([value.assignee, value.description, value.key, value.lane, value.referenceId, value.status, value.title, value.type]); }
function titleFromContent(value: string) { return plainText(value).split(/[.!?\n]/u).find((part) => part.trim())?.trim().slice(0, 96) ?? ""; }
function readSnapshots(id: string) { try { return JSON.parse(localStorage.getItem(`devkit:idea-history:${id}`) ?? "[]") as IdeaSnapshot[]; } catch { return []; } }
function saveSnapshot(value: CoworkerProjectRecord, current: IdeaSnapshot[]) {
  const next = [{ description: value.description, savedAt: new Date().toISOString(), title: value.title }, ...current].slice(0, 5);
  try { localStorage.setItem(`devkit:idea-history:${value.id}`, JSON.stringify(next)); } catch { /* Local history is optional. */ }
  return next;
}
function readRecovery(id: string) { try { return JSON.parse(localStorage.getItem(`devkit:idea-recovery:${id}`) ?? "null") as CoworkerProjectRecord | null; } catch { return null; } }
function saveRecovery(id: string, value: CoworkerProjectRecord) { try { localStorage.setItem(`devkit:idea-recovery:${id}`, JSON.stringify(value)); notifyIdeaDraftChange(); } catch { /* Recovery is optional. */ } }
function clearRecovery(id: string) { try { localStorage.removeItem(`devkit:idea-recovery:${id}`); notifyIdeaDraftChange(); } catch { /* Recovery is optional. */ } }
function notifyIdeaDraftChange() { window.dispatchEvent(new Event("devkit:idea-drafts-change")); }
