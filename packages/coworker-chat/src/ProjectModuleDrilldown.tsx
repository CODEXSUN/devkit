import { ArrowLeft, ClipboardCheck, ListChecks, Zap } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import type { CoworkerProjectRecord, CoworkerRegistryModule } from "./types";
import { pendingTasks, ProjectWorkList } from "./ProjectWorkList";

export type ModuleDrillKind = "action" | "review" | "task";

export function ProjectModuleDrilldown({ kind, module, onBack, onKindChange, records }: {
  kind: ModuleDrillKind;
  module: CoworkerRegistryModule;
  onBack: () => void;
  onKindChange: (kind: ModuleDrillKind) => void;
  records: CoworkerProjectRecord[];
}) {
  const escapeArmed = useRef(false);
  const escapeTimer = useRef<number | null>(null);
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (escapeArmed.current) {
        event.preventDefault();
        escapeArmed.current = false;
        if (escapeTimer.current) window.clearTimeout(escapeTimer.current);
        onBack();
        return;
      }
      escapeArmed.current = true;
      escapeTimer.current = window.setTimeout(() => { escapeArmed.current = false; }, 900);
    };
    window.addEventListener("keydown", handleEscape);
    return () => { window.removeEventListener("keydown", handleEscape); if (escapeTimer.current) window.clearTimeout(escapeTimer.current); };
  }, [onBack]);

  const associated = records.filter((record) => belongsToModule(record, module, records));
  const visible = kind === "task" ? pendingTasks(associated) : associated.filter((record) => record.kind === (kind === "action" ? "activity" : "review"));
  return <section className="project-module-drilldown">
    <header>
      <button aria-label="Back to modules" onClick={onBack} type="button"><ArrowLeft size={16} /></button>
      <div><small>Module drill down</small><h2>{module.name}</h2><p>{label(kind)} associated with this module only.</p></div>
      <span>Esc twice to go up</span>
    </header>
    <nav aria-label={`${module.name} work views`}>
      <DrillButton active={kind === "task"} icon={<ListChecks size={14} />} label="Tasks" onClick={() => onKindChange("task")} />
      <DrillButton active={kind === "action"} icon={<Zap size={14} />} label="Actions" onClick={() => onKindChange("action")} />
      <DrillButton active={kind === "review"} icon={<ClipboardCheck size={14} />} label="Reviews" onClick={() => onKindChange("review")} />
    </nav>
    <ProjectWorkList empty={`No associated ${label(kind).toLowerCase()}`} kind={kind} records={visible} />
  </section>;
}

function DrillButton({ active, icon, label: text, onClick }: { active: boolean; icon: ReactNode; label: string; onClick: () => void }) {
  return <button aria-current={active ? "page" : undefined} onClick={onClick} type="button">{icon}{text}</button>;
}

function belongsToModule(record: CoworkerProjectRecord, module: CoworkerRegistryModule, records: CoworkerProjectRecord[]) {
  const moduleKeys = new Set([module.id, module.key, module.name].map(normalize));
  let current: CoworkerProjectRecord | undefined = record;
  const visited = new Set<string>();
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    if (moduleKeys.has(normalize(current.moduleKey || "")) || moduleKeys.has(normalize(current.referenceId))) return true;
    current = records.find((candidate) => candidate.id === current?.referenceId || candidate.key === current?.referenceId);
  }
  return false;
}

function normalize(value: string) { return value.trim().toLowerCase(); }
function label(value: ModuleDrillKind) { return value === "task" ? "Tasks" : value === "action" ? "Actions" : "Reviews"; }
