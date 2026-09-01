import { Archive, MoreVertical, Pencil, Save, X } from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import type { CoworkerClient } from "./client";
import type { CoworkerProject } from "./types";
import { ProjectUserLookup } from "./ProjectUserLookup";

export function ProjectOverviewActions({
  client,
  onArchived,
  onUpdated,
  project
}: {
  client: CoworkerClient;
  onArchived: (project: CoworkerProject) => void;
  onUpdated: (project: CoworkerProject) => void;
  project: CoworkerProject;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof PointerEvent && menuRef.current?.contains(event.target as Node)) return;
      setMenuOpen(false);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", close);
    };
  }, [menuOpen]);

  async function archiveProject() {
    setMenuOpen(false);
    if (!window.confirm(`Archive ${project.title}? You can restore it from Project Manager.`)) return;
    setBusy(true);
    setError("");
    try {
      const archived = await client.archiveProjectRecord("project", project.id);
      onArchived({ ...project, ...archived, active: false });
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="project-overview-actions" ref={menuRef}>
      <button
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label="Project actions"
        disabled={busy}
        onClick={() => setMenuOpen((open) => !open)}
        type="button"
      >
        <MoreVertical size={19} />
      </button>
      {menuOpen ? (
        <div className="project-overview-menu" role="menu">
          <button onClick={() => { setEditing(true); setMenuOpen(false); }} role="menuitem" type="button">
            <Pencil size={15} /> Edit project
          </button>
          <button className="danger" onClick={() => void archiveProject()} role="menuitem" type="button">
            <Archive size={15} /> Archive project
          </button>
        </div>
      ) : null}
      {error ? <p className="project-overview-action-error" role="alert">{error}</p> : null}
      {editing ? (
        <ProjectEditor
          client={client}
          onClose={() => setEditing(false)}
          onSaved={(saved) => { onUpdated(saved); setEditing(false); }}
          project={project}
        />
      ) : null}
    </div>
  );
}

function ProjectEditor({ client, onClose, onSaved, project }: {
  client: CoworkerClient;
  onClose: () => void;
  onSaved: (project: CoworkerProject) => void;
  project: CoworkerProject;
}) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [status, setStatus] = useState(project.status || "planning");
  const [logoText, setLogoText] = useState(project.logoText || "");
  const [colorKey, setColorKey] = useState(project.colorKey || "slate");
  const [associatedUsers, setAssociatedUsers] = useState(() => parseAssociatedUsers(project.assignee));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const saved = await client.updateProjectRecord("project", project.id, {
        assignee: associatedUsers.join(","),
        colorKey,
        description: description.trim(),
        logoText: logoText.trim().toUpperCase(),
        status,
        title: title.trim()
      });
      onSaved({ ...project, ...saved, colorKey, logoText: logoText.trim().toUpperCase() });
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div aria-labelledby="project-editor-title" aria-modal="true" className="project-editor-backdrop" role="dialog">
      <form className="project-editor-panel" onSubmit={(event) => void save(event)}>
        <header><div><h2 id="project-editor-title">Edit project</h2><p>Update the project identity shown across workspaces.</p></div><button aria-label="Close project editor" onClick={onClose} type="button"><X size={18} /></button></header>
        <label><span>Project name</span><input autoFocus onChange={(event) => setTitle(event.target.value)} value={title} /></label>
        <label><span>Description</span><textarea onChange={(event) => setDescription(event.target.value)} rows={3} value={description} /></label>
        <div className="project-editor-row"><label><span>Logo text</span><input maxLength={4} onChange={(event) => setLogoText(event.target.value.toUpperCase())} value={logoText} /></label><label><span>Colour</span><select onChange={(event) => setColorKey(event.target.value)} value={colorKey}>{["slate", "violet", "amber", "blue", "emerald", "rose", "indigo"].map((color) => <option key={color} value={color}>{titleCase(color)}</option>)}</select></label></div>
        <label><span>Status</span><select onChange={(event) => setStatus(event.target.value)} value={status}>{["planning", "active", "on-hold", "completed"].map((value) => <option key={value} value={value}>{titleCase(value)}</option>)}</select></label>
        <ProjectUserLookup client={client} onChange={setAssociatedUsers} value={associatedUsers} />
        {error ? <p role="alert">{error}</p> : null}
        <footer><button onClick={onClose} type="button">Cancel</button><button disabled={busy || !title.trim()} type="submit"><Save size={15} />{busy ? "Saving…" : "Save changes"}</button></footer>
      </form>
    </div>
  );
}

function messageOf(reason: unknown) {
  return reason instanceof Error ? reason.message : "The project could not be updated.";
}

function titleCase(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}

function parseAssociatedUsers(value?: string) {
  return [...new Set((value || "").split(/[,;\n]/u).map((entry) => entry.trim()).filter(Boolean))];
}
