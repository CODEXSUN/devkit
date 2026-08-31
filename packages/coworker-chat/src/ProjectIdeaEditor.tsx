import { ArrowLeft, Code2, Eye, FileCode2, LockKeyhole, PanelRightClose, PanelRightOpen, PenTool, Save } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { WorkspaceEditor } from "@codexsun/ui/workspace";
import type { CoworkerClient } from "./client";
import type { CoworkerProject, CoworkerProjectRecord } from "./types";

type EditorMode = "compose" | "html" | "markdown" | "preview";

export function ProjectIdeaEditor({ client, idea, onBack, onSaved, project }: {
  client: CoworkerClient; idea: CoworkerProjectRecord; onBack: () => void;
  onSaved: (idea: CoworkerProjectRecord) => void; project?: CoworkerProject;
}) {
  const [draft, setDraft] = useState(idea);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<EditorMode>("compose");
  const [projects, setProjects] = useState<CoworkerProject[]>([]);
  const [globalIdeas, setGlobalIdeas] = useState<CoworkerProjectRecord[]>([]);
  const [saving, setSaving] = useState(false);
  const creating = idea.id.startsWith("draft:");
  const tags = useMemo(() => hashtags(draft.description), [draft.description]);

  useEffect(() => setDraft(idea), [idea]);
  useEffect(() => { void client.projects().then(setProjects).catch(() => setProjects([])); }, [client]);
  useEffect(() => { void client.projectRecords("discussion").then((records) => setGlobalIdeas(records.filter((record) => !record.referenceId && record.id !== idea.id))).catch(() => setGlobalIdeas([])); }, [client, idea.id]);

  async function save() {
    if (!draft.title.trim() || saving) return;
    setSaving(true); setError("");
    const payload = {
      assignee: draft.assignee ?? "", description: draft.description,
      key: draft.key || ideaKey(draft.title), lane: draft.lane,
      referenceId: project?.id ?? draft.referenceId,
      referenceType: project ? "project" : draft.referenceId ? "project" : "",
      status: draft.status || "open", title: draft.title.trim(), type: draft.type || "general"
    };
    try {
      const saved = creating ? await client.createProjectRecord("discussion", payload) : await client.updateProjectRecord("discussion", idea.id, payload);
      setDraft(saved); onSaved(saved);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The idea could not be saved.");
    } finally { setSaving(false); }
  }

  return <section className={`project-idea-editor${drawerOpen ? " drawer-open" : ""}`}>
    <header>
      <button aria-label="Back to ideas" onClick={onBack} title="Back to ideas" type="button"><ArrowLeft size={17} /></button>
      <strong>#{draft.key || "new"} · {creating ? "New idea" : "Edit idea"}</strong>
      <div>
        <button className="idea-privacy-button" title="Private to this DevKit workspace" type="button"><LockKeyhole size={15} /></button>
        <button aria-expanded={drawerOpen} aria-label={drawerOpen ? "Collapse properties" : "Open properties"} onClick={() => setDrawerOpen((open) => !open)} title={drawerOpen ? "Collapse properties" : "Open properties"} type="button">{drawerOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}</button>
        <button className="idea-save-button" disabled={!draft.title.trim() || saving} onClick={() => void save()} type="button"><Save size={15} /> {saving ? "Saving…" : creating ? "Create idea" : "Save changes"}</button>
      </div>
    </header>
    <main>
      <input aria-label="Idea title" autoFocus onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Idea title" value={draft.title} />
      <div className="idea-editor-modes" aria-label="Editor mode">
        <ModeButton active={mode === "compose"} icon={<PenTool size={15} />} label="Compose" onClick={() => setMode("compose")} />
        <ModeButton active={mode === "markdown"} icon={<FileCode2 size={15} />} label="Markdown" onClick={() => setMode("markdown")} />
        <ModeButton active={mode === "html"} icon={<Code2 size={15} />} label="HTML" onClick={() => setMode("html")} />
        <ModeButton active={mode === "preview"} icon={<Eye size={15} />} label="Preview" onClick={() => setMode("preview")} />
      </div>
      {mode === "compose" ? <WorkspaceEditor key="compose" content={draft.description} fullPreview onChange={(description: string) => setDraft((current) => ({ ...current, description }))} placeholder="Explain the problem, proposal, trade-offs, and feedback you need…" /> : null}
      {mode === "markdown" ? <WorkspaceEditor key="markdown" content={draft.description} fullPreview initialMode="markdown" onChange={(description: string) => setDraft((current) => ({ ...current, description }))} placeholder="Write with Markdown…" /> : null}
      {mode === "html" ? <textarea aria-label="Idea HTML" className="idea-html-editor" onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} value={draft.description} /> : null}
      {mode === "preview" ? <iframe className="idea-preview" sandbox="" srcDoc={draft.description} title="Idea preview" /> : null}
      {error ? <p role="alert">{error}</p> : null}
    </main>
    <aside aria-hidden={!drawerOpen}>
      <button aria-label="Collapse properties" onClick={() => setDrawerOpen(false)} title="Collapse properties" type="button"><PanelRightClose size={17} /></button>
      <IdeaField color="#2563eb" label="Category"><select aria-label="Idea category" onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))} value={draft.type || "general"}><option value="general">General</option><option value="product">Product</option><option value="engineering">Engineering</option><option value="design">Design</option><option value="research">Research</option></select></IdeaField>
      <IdeaField color="#0891b2" label="Status"><select aria-label="Idea status" onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value }))} value={draft.status || "open"}><option value="open">Open</option><option value="planning">Planning</option><option value="in-progress">In progress</option><option value="blocked">Blocked</option><option value="completed">Completed</option></select></IdeaField>
      <IdeaField label="Project"><select aria-label="Idea project" disabled={Boolean(project)} onChange={(event) => setDraft((current) => ({ ...current, referenceId: event.target.value }))} value={project?.id ?? draft.referenceId}><option value="">Global idea</option>{projects.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></IdeaField>
      {(project || draft.referenceId) ? <IdeaField label="Global idea link"><select aria-label="Linked global idea" onChange={(event) => setDraft((current) => ({ ...current, lane: event.target.value ? `global:${event.target.value}` : "" }))} value={draft.lane.startsWith("global:") ? draft.lane.slice(7) : ""}><option value="">No global link</option>{globalIdeas.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></IdeaField> : null}
      <IdeaField label="Tags"><output>{tags.length ? tags.map((tag) => `#${tag}`).join(" ") : "Add #tags in the content"}</output></IdeaField>
      <IdeaField label="Assigned to"><input aria-label="Assigned user" onChange={(event) => setDraft((current) => ({ ...current, assignee: event.target.value }))} placeholder="Name or email" value={draft.assignee ?? ""} /></IdeaField>
    </aside>
  </section>;
}

function ModeButton({ active, icon, label, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) { return <button aria-pressed={active} className={active ? "active" : ""} onClick={onClick} type="button">{icon}{label}</button>; }
function IdeaField({ children, color, label }: { children: ReactNode; color?: string; label: string }) { return <label className="project-idea-field"><span>{label}{color ? <i aria-hidden="true" style={{ background: color }} /> : null}</span>{children}</label>; }
function hashtags(value: string) { return [...new Set([...value.matchAll(/#([a-z0-9-]{2,48})/giu)].map((match) => match[1]!.toLowerCase()))]; }
function ideaKey(title: string) { return `IDEA-${title.trim().replace(/[^a-z0-9]+/giu, "-").replace(/^-|-$/gu, "").slice(0, 32).toUpperCase() || "NEW"}`; }
