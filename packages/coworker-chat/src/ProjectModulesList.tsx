import { Boxes, Clock3, ListChecks } from "lucide-react";
import type { CoworkerRegistryModule } from "./types";
import type { ModuleDrillKind } from "./ProjectModuleDrilldown";

export function ProjectModulesList({ modules, onDrill, onEdit }: {
  modules: CoworkerRegistryModule[];
  onDrill: (module: CoworkerRegistryModule, kind: ModuleDrillKind) => void;
  onEdit: (module: CoworkerRegistryModule) => void;
}) {
  if (!modules.length) return <div className="ideas-empty"><Boxes size={24} /><strong>No modules created yet</strong><p>Create modules in the platform registry to see them here.</p></div>;
  return <div className="ideas-list project-modules-list">
    {modules.map((module, index) => <article key={module.id}>
      <div className="ideas-row-body">
        <button className="ideas-row-open" onClick={() => onEdit(module)} type="button">
          <span><Boxes size={18} /></span>
          <b className="ideas-serial">{String(index + 1).padStart(3, "0")}</b>
          <div><strong>{module.name}</strong><p>{plainText(module.description) || "No short description provided."}</p></div>
        </button>
        <div className="ideas-row-details"><span>{label(module.moduleType)}</span>{module.routePath ? <span>{module.routePath}</span> : null}</div>
      </div>
      <div className="ideas-row-meta"><div className="module-drill-actions"><button onClick={() => onDrill(module, "task")} title="Associated tasks" type="button"><ListChecks size={13} /> Tasks</button></div><em>{module.active ? label(module.status || "active") : "Inactive"}</em><small><Clock3 size={12} /> {formatUpdated(module.updatedAt)}</small></div>
    </article>)}
  </div>;
}

function label(value: string) { return value.replaceAll("-", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase()); }
function plainText(value: string) { return value.replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ").trim(); }
function formatUpdated(value?: string) { if (!value) return "Recently"; return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(new Date(value)); }
