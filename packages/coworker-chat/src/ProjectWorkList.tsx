import { Boxes, ClipboardCheck, Clock3, Database, FileClock, ListChecks, Zap } from "lucide-react";
import type { CoworkerProjectRecord } from "./types";
import { architectureSummary } from "./ProjectArchitecturePlanner";

export function ProjectWorkList({ empty, kind, onOpen, records }: {
  empty: string;
  kind: "action" | "architecture" | "changelog" | "review" | "schema" | "task";
  onOpen?: (record: CoworkerProjectRecord) => void;
  records: CoworkerProjectRecord[];
}) {
  if (!records.length) return <div className="ideas-empty project-work-empty">{kind === "task" ? <ListChecks size={24} /> : kind === "action" ? <Zap size={24} /> : kind === "architecture" ? <Boxes size={24} /> : kind === "schema" ? <Database size={24} /> : kind === "changelog" ? <FileClock size={24} /> : <ClipboardCheck size={24} />}<strong>{empty}</strong></div>;
  const Icon = kind === "task" ? ListChecks : kind === "action" ? Zap : kind === "architecture" ? Boxes : kind === "schema" ? Database : kind === "changelog" ? FileClock : ClipboardCheck;
  return <div className={`ideas-list project-work-list ${kind}`}>
    {records.map((record, index) => {
      const tags = hashtags(record.description);
      return <article key={record.id}>
        <div className="ideas-row-body">
          <button className="ideas-row-open project-work-row-main" disabled={!onOpen} onClick={() => onOpen?.(record)} type="button"><span><Icon size={18} /></span><b className="ideas-serial">{String(index + 1).padStart(3, "0")}</b><div><strong>{record.title}</strong><p>{kind === "architecture" || kind === "schema" ? architectureSummary(record.description) : plainText(record.description) || "No details added."}</p></div></button>
          {kind !== "architecture" && kind !== "schema" ? <div className="ideas-row-details"><span>{label(record.moduleKey || record.type || kind)}</span>{tags.length ? <span className="project-note-tags">{tags.map((tag) => <b key={tag}>#{tag}</b>)}</span> : null}</div> : null}
        </div>
        <div className="ideas-row-meta"><em>{label(record.status || "open")}</em><small><Clock3 size={12} /> {formatUpdated(record.updatedAt ?? record.createdAt)}</small></div>
      </article>;
    })}
  </div>;
}

export function pendingTasks(records: CoworkerProjectRecord[]) {
  return records.filter((record) => record.kind === "task" && !["approved", "cancelled", "completed", "done", "released"].includes(record.status.toLowerCase()));
}

function hashtags(value: string) { return [...new Set([...value.matchAll(/#([a-z0-9-]{2,48})/giu)].map((match) => match[1]!.toLowerCase()))]; }
function label(value: string) { return value.replaceAll("-", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase()); }
function plainText(value: string) { return value.replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ").trim(); }
function formatUpdated(value?: string) { if (!value) return "Recently"; const elapsed = Date.now() - Date.parse(value); if (elapsed < 60_000) return "Just now"; if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`; if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h ago`; return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(new Date(value)); }
