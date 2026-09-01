import { Archive, Clock3, Globe2, Info, Lightbulb, LockKeyhole, MoreVertical, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { WorkspaceLookup, type WorkspaceLookupOption } from "@codexsun/ui/workspace";
import type { CoworkerClient } from "./client";
import { ProjectIdeaEditor } from "./ProjectIdeaEditor";
import type { CoworkerProjectRecord } from "./types";

const categories = ["all", "general", "product", "engineering", "design", "research"];

export function IdeasWorkspace({ client }: { client: CoworkerClient }) {
  const [ideas, setIdeas] = useState<CoworkerProjectRecord[]>([]);
  const [editing, setEditing] = useState<CoworkerProjectRecord | null>(null);
  const [filter, setFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("");
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<"all" | "global" | "project">("all");
  const [sort, setSort] = useState<"updated" | "newest" | "status" | "title">("updated");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const options = useMemo<WorkspaceLookupOption[]>(
    () => categories.map((value) => ({ label: value === "all" ? "All ideas" : label(value), value })),
    []
  );
  const visible = useMemo(() => ideas
    .filter((idea) => filter === "all" || idea.type === filter)
    .filter((idea) => !tagFilter || hashtags(idea.description).includes(tagFilter))
    .filter((idea) => scope === "all" || (scope === "global" ? !idea.referenceId : Boolean(idea.referenceId)))
    .filter((idea) => matchesQuery(idea, query))
    .sort((left, right) => compareIdeas(left, right, sort)), [filter, ideas, query, scope, sort, tagFilter]);

  useEffect(() => {
    void client.projectRecords("discussion").then(setIdeas).catch(() => setIdeas([]));
  }, [client]);

  if (editing) {
    return <ProjectIdeaEditor client={client} idea={editing} onBack={() => setEditing(null)} onSaved={(saved) => {
      setIdeas((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
      setEditing(null);
    }} />;
  }

  async function archiveIdea(idea: CoworkerProjectRecord) {
    setActionError("");
    try {
      await client.archiveProjectRecord("discussion", idea.id);
      setIdeas((current) => current.filter((item) => item.id !== idea.id));
    } catch (reason) { setActionError(messageFrom(reason)); }
    finally { setMenuId(null); }
  }

  async function deleteIdea(idea: CoworkerProjectRecord) {
    if (!window.confirm(`Delete “${idea.title}”? This cannot be undone.`)) return;
    setActionError("");
    try {
      await client.deleteProjectRecord("discussion", idea.id);
      setIdeas((current) => current.filter((item) => item.id !== idea.id));
    } catch (reason) { setActionError(messageFrom(reason)); }
    finally { setMenuId(null); }
  }

  async function makePublic(idea: CoworkerProjectRecord) {
    setActionError("");
    try {
      const saved = await client.updateProjectRecord("discussion", idea.id, { lane: "", referenceId: "", referenceType: "" });
      setIdeas((current) => current.map((item) => item.id === saved.id ? saved : item));
    } catch (reason) { setActionError(messageFrom(reason)); }
    finally { setMenuId(null); }
  }

  return <section className="ideas-workspace">
    <div className="ideas-toolbar">
      <WorkspaceLookup
        allowTextValue={false}
        className="ideas-filter-lookup"
        clearable={false}
        compactOptions
        dropdownClassName="ideas-filter-options"
        dropdownMinWidth={280}
        emptyLabel="No idea category found."
        options={options}
        placeholder="Filter ideas"
        showAllOptionsOnFocus
        value={filter}
        onValueChange={setFilter}
      />
      <label className="ideas-search"><Search size={15} /><input aria-label="Search ideas" onChange={(event) => setQuery(event.target.value)} placeholder="Search ideas" value={query} /></label>
      <select aria-label="Idea scope" className="ideas-select" onChange={(event) => setScope(event.target.value as typeof scope)} value={scope}><option value="all">All ideas</option><option value="global">Global ideas</option><option value="project">Project ideas</option></select>
      <select aria-label="Sort ideas" className="ideas-select" onChange={(event) => setSort(event.target.value as typeof sort)} value={sort}><option value="updated">Last updated</option><option value="newest">Newest first</option><option value="title">Title A–Z</option><option value="status">Status</option></select>
      <button onClick={() => setEditing(newIdea())} type="button"><Plus size={16} /> New idea</button>
    </div>
    <div className="ideas-list-summary"><span>{visible.length} {visible.length === 1 ? "idea" : "ideas"}</span><span>{tagFilter ? <button onClick={() => setTagFilter("")} type="button">#{tagFilter} ×</button> : scope === "all" ? "Global and project work" : `${label(scope)} ideas`}</span></div>
    {actionError ? <p className="ideas-action-error" role="alert">{actionError}</p> : null}
    {visible.length ? <div className="ideas-list">{visible.map((idea, index) => <article key={idea.id}><div className="ideas-row-body"><button className="ideas-row-open" onClick={() => setEditing(idea)} type="button"><span><Lightbulb size={18} /></span><b className="ideas-serial">{String(index + 1).padStart(3, "0")}</b><div><strong>{idea.title}</strong><p>{ideaPreview(idea.description)}</p></div></button><div className="ideas-row-details">{idea.referenceId ? <LockKeyhole aria-label="Private to project" size={13} /> : <Globe2 aria-label="Global idea" size={13} />}<button onClick={() => { setFilter(idea.type || "general"); setTagFilter(""); }} type="button">{label(idea.type || "general")}</button><IdeaTags onSelect={setTagFilter} tags={hashtags(idea.description)} /></div></div><div className="ideas-row-meta"><em>{label(idea.status || "open")}</em><small><Clock3 size={12} /> {formatUpdated(idea.updatedAt ?? idea.createdAt)}</small><button aria-expanded={menuId === idea.id} aria-label={`More actions for ${idea.title}`} className="ideas-more-button" onClick={() => setMenuId((current) => current === idea.id ? null : idea.id)} type="button"><MoreVertical size={17} /></button>{menuId === idea.id ? <div className="ideas-row-menu"><button onClick={() => setEditing(idea)} type="button"><Info size={14} /> Open details</button>{idea.referenceId ? <button onClick={() => void makePublic(idea)} type="button"><Globe2 size={14} /> Make public</button> : null}<button onClick={() => void archiveIdea(idea)} type="button"><Archive size={14} /> Archive</button><button className="danger" onClick={() => void deleteIdea(idea)} type="button"><Trash2 size={14} /> Delete</button></div> : null}</div></article>)}</div> : <div className="ideas-empty"><Lightbulb size={24} /><strong>No matching ideas</strong><p>Try a different search, filter, or create a new discussion.</p></div>}
  </section>;
}

function newIdea(): CoworkerProjectRecord { return { description: "", id: `draft:${crypto.randomUUID()}`, key: "", kind: "discussion", lane: "", referenceId: "", referenceType: "", status: "open", title: "", type: "general" }; }
function IdeaTags({ onSelect, tags }: { onSelect: (tag: string) => void; tags: string[] }) { return tags.length ? <span className="ideas-tag-list">{tags.map((tag) => <button key={tag} onClick={() => onSelect(tag)} type="button">#{tag}</button>)}</span> : null; }
function hashtags(value: string) { return [...new Set([...value.matchAll(/#([a-z0-9-]{2,48})/giu)].map((match) => match[1]!.toLowerCase()))]; }
function label(value: string) { return value.replaceAll("-", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase()); }
function plainText(value: string) { return value.replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ").trim(); }
function ideaPreview(value: string) { const text = plainText(value); try { const parsed = JSON.parse(text); if (parsed && typeof parsed === "object") return "Structured content · Open to view details."; } catch { /* Plain text is shown below. */ } return text || "No short description provided."; }
function matchesQuery(idea: CoworkerProjectRecord, query: string) { const value = query.trim().toLowerCase(); return !value || [idea.title, idea.description, idea.assignee, idea.key].some((entry) => entry?.toLowerCase().includes(value)); }
function compareIdeas(left: CoworkerProjectRecord, right: CoworkerProjectRecord, sort: "updated" | "newest" | "status" | "title") { if (sort === "title") return left.title.localeCompare(right.title); if (sort === "status") return (left.status || "open").localeCompare(right.status || "open") || left.title.localeCompare(right.title); const first = sort === "newest" ? left.createdAt : left.updatedAt ?? left.createdAt; const second = sort === "newest" ? right.createdAt : right.updatedAt ?? right.createdAt; return (Date.parse(second ?? "") || 0) - (Date.parse(first ?? "") || 0); }
function formatUpdated(value?: string) { if (!value) return "Recently"; const elapsed = Date.now() - Date.parse(value); if (elapsed < 60_000) return "Just now"; if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`; if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h ago`; return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(new Date(value)); }
function messageFrom(reason: unknown) { return reason instanceof Error ? reason.message : "The idea could not be updated."; }
