import { ArchiveRestore, Folder, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { CoworkerChat, CoworkerProject } from "./types";

type DeleteTarget = { kind: "all" } | { chat: CoworkerChat; kind: "chat" } | null;

export function ArchivedChatsPage({
  chats,
  onDelete,
  onDeleteAll,
  onRestore,
  projects
}: {
  chats: CoworkerChat[];
  onDelete: (chat: CoworkerChat) => Promise<void>;
  onDeleteAll: () => Promise<void>;
  onRestore: (chat: CoworkerChat) => Promise<void>;
  projects: CoworkerProject[];
}) {
  const [busy, setBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [projectId, setProjectId] = useState("all");
  const [query, setQuery] = useState("");
  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.title])),
    [projects]
  );
  const visibleChats = chats.filter((chat) => {
    const matchesProject = projectId === "all" || chat.projectUuid === projectId;
    const matchesQuery = `${chat.title} ${projectNames.get(chat.projectUuid) ?? "General"}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase());
    return matchesProject && matchesQuery;
  });
  const groups = [...new Set(visibleChats.map((chat) => projectNames.get(chat.projectUuid) ?? "General"))];

  async function confirmDelete() {
    if (!deleteTarget || busy) return;
    setBusy(true);
    try {
      if (deleteTarget.kind === "all") await onDeleteAll();
      else await onDelete(deleteTarget.chat);
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="archived-chats-page">
      <header>
        <div>
          <h1>Archived chats</h1>
          <p>Restore conversations or permanently remove their messages and history.</p>
        </div>
        <button
          className="archive-delete-all"
          disabled={!chats.length}
          onClick={() => setDeleteTarget({ kind: "all" })}
          type="button"
        >
          <Trash2 size={15} /> Delete all
        </button>
      </header>
      <div className="archive-filters">
        <label>
          <Search size={16} />
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search archived chats"
            value={query}
          />
        </label>
        <select aria-label="Filter archived chats by project" onChange={(event) => setProjectId(event.target.value)} value={projectId}>
          <option value="all">All projects</option>
          {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
        </select>
      </div>
      <div className="archive-groups">
        {groups.map((group) => {
          const groupChats = visibleChats.filter(
            (chat) => (projectNames.get(chat.projectUuid) ?? "General") === group
          );
          return (
            <section key={group}>
              <header><span><Folder size={15} /> {group}</span><small>{groupChats.length} {groupChats.length === 1 ? "chat" : "chats"}</small></header>
              {groupChats.map((chat) => (
                <article key={chat.uuid}>
                  <div><strong>{chat.title}</strong><time>{formatArchiveDate(chat.updatedAt)}</time></div>
                  <span>
                    <button aria-label={`Permanently delete ${chat.title}`} className="archive-row-delete" onClick={() => setDeleteTarget({ chat, kind: "chat" })} title="Delete permanently" type="button"><Trash2 size={15} /></button>
                    <button onClick={() => void onRestore(chat)} type="button"><ArchiveRestore size={15} /> Restore</button>
                  </span>
                </article>
              ))}
            </section>
          );
        })}
        {!visibleChats.length ? <div className="archive-empty"><ArchiveRestore size={22} /><strong>No archived chats</strong><p>{query || projectId !== "all" ? "Try a different search or project." : "Archived Agent conversations will appear here."}</p></div> : null}
      </div>
      {deleteTarget ? (
        <div className="archive-dialog-backdrop" role="presentation">
          <section aria-labelledby="archive-delete-title" aria-modal="true" className="archive-delete-dialog" role="dialog">
            <button aria-label="Close warning" className="archive-dialog-close" disabled={busy} onClick={() => setDeleteTarget(null)} type="button"><X size={17} /></button>
            <span className="archive-dialog-icon"><Trash2 size={20} /></span>
            <h2 id="archive-delete-title">Delete permanently?</h2>
            <p>{deleteTarget.kind === "all" ? `This will permanently delete all ${chats.length} archived conversations and every stored message.` : `This will permanently delete “${deleteTarget.chat.title}” and every stored message.`}</p>
            <strong>This action cannot be undone.</strong>
            <footer><button disabled={busy} onClick={() => setDeleteTarget(null)} type="button">Cancel</button><button disabled={busy} onClick={() => void confirmDelete()} type="button">{busy ? "Deleting…" : "Delete permanently"}</button></footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function formatArchiveDate(value: string) {
  return new Date(value).toLocaleString([], { day: "numeric", hour: "2-digit", minute: "2-digit", month: "short", year: "numeric" });
}
