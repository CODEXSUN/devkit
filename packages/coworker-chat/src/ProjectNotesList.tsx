import { Archive, Clock3, Info, MoreVertical, NotebookPen, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { CoworkerClient } from "./client";
import type { CoworkerProjectRecord } from "./types";

export function ProjectNotesList({ client, notes, onEdit, onRemoved }: {
  client: CoworkerClient;
  notes: CoworkerProjectRecord[];
  onEdit: (note: CoworkerProjectRecord) => void;
  onRemoved: (note: CoworkerProjectRecord) => void;
}) {
  const [menuId, setMenuId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!menuId) return;
    const close = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent && event.key !== "Escape") return;
      if (event instanceof PointerEvent && event.target instanceof Element && event.target.closest(".ideas-row-menu, .ideas-more-button")) return;
      setMenuId(null);
    };
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => { window.removeEventListener("pointerdown", close); window.removeEventListener("keydown", close); };
  }, [menuId]);

  async function archive(note: CoworkerProjectRecord) {
    setError("");
    try { await client.archiveProjectRecord("discussion", note.id); onRemoved(note); }
    catch (reason) { setError(messageOf(reason)); }
    finally { setMenuId(null); }
  }

  async function remove(note: CoworkerProjectRecord) {
    if (!window.confirm(`Delete “${note.title}”? This cannot be undone.`)) return;
    setError("");
    try { await client.deleteProjectRecord("discussion", note.id); onRemoved(note); }
    catch (reason) { setError(messageOf(reason)); }
    finally { setMenuId(null); }
  }

  if (!notes.length) return <div className="ideas-empty project-notes-empty"><NotebookPen size={24} /><strong>No project notes yet</strong><p>Project notes can link to an existing global idea.</p></div>;

  return <>
    {error ? <p className="ideas-action-error" role="alert">{error}</p> : null}
    <div className="ideas-list project-notes-list">
      {notes.map((note, index) => {
        const tags = hashtags(note.description);
        return <article key={note.id}>
          <div className="ideas-row-body">
            <button className="ideas-row-open" onClick={() => onEdit(note)} type="button"><span><NotebookPen size={18} /></span><b className="ideas-serial">{String(index + 1).padStart(3, "0")}</b><div><strong>{note.title}</strong><p>{plainText(note.description) || "No short description provided."}</p></div></button>
            <div className="ideas-row-details"><span>{label(note.type || "general")}</span>{tags.length ? <span className="project-note-tags">{tags.map((tag) => <b key={tag}>#{tag}</b>)}</span> : null}</div>
          </div>
          <div className="ideas-row-meta"><em>{label(note.status || "open")}</em><small><Clock3 size={12} /> {formatUpdated(note.updatedAt ?? note.createdAt)}</small><button aria-expanded={menuId === note.id} aria-label={`More actions for ${note.title}`} className="ideas-more-button" onClick={() => setMenuId((current) => current === note.id ? null : note.id)} type="button"><MoreVertical size={17} /></button>{menuId === note.id ? <div className="ideas-row-menu"><button onClick={() => onEdit(note)} type="button"><Info size={14} /> Open details</button><button onClick={() => void archive(note)} type="button"><Archive size={14} /> Archive</button><button className="danger" onClick={() => void remove(note)} type="button"><Trash2 size={14} /> Delete</button></div> : null}</div>
        </article>;
      })}
    </div>
  </>;
}

function hashtags(value: string) { return [...new Set([...value.matchAll(/#([a-z0-9-]{2,48})/giu)].map((match) => match[1]!.toLowerCase()))]; }
function label(value: string) { return value.replaceAll("-", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase()); }
function plainText(value: string) { return value.replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ").trim(); }
function formatUpdated(value?: string) { if (!value) return "Recently"; const elapsed = Date.now() - Date.parse(value); if (elapsed < 60_000) return "Just now"; if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`; if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h ago`; return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(new Date(value)); }
function messageOf(reason: unknown) { return reason instanceof Error ? reason.message : "The note could not be updated."; }
