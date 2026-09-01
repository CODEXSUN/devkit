import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Boxes, ClipboardCheck, Database, FileClock, ListChecks, Network, PenTool, Plus } from "lucide-react";
import type { CoworkerClient } from "./client";
import type { CoworkerProject, CoworkerProjectRecord, CoworkerRegistryGroup, CoworkerRegistryModule } from "./types";
import { ProjectIdeaEditor } from "./ProjectIdeaEditor";
import { ProjectOverviewActions } from "./ProjectOverviewActions";
import { ProjectProgress, projectProgress } from "./ProjectProgress";
import { ProjectNotesList } from "./ProjectNotesList";
import { pendingTasks, ProjectWorkList } from "./ProjectWorkList";
import { ProjectModulesList } from "./ProjectModulesList";
import { ProjectModuleEditor } from "./ProjectModuleEditor";
import { ProjectArchitecturePlanner } from "./ProjectArchitecturePlanner";
import { ProjectModuleDrilldown, type ModuleDrillKind } from "./ProjectModuleDrilldown";

const ProjectWhiteBoard = lazy(() =>
  import("./ProjectWhiteBoard").then((module) => ({ default: module.ProjectWhiteBoard }))
);

const tabs = [
  "Overview",
  "Notes",
  "Modules",
  "Tasks",
  "Reviews",
  "Architect",
  "White Board",
  "Schema",
  "Changelog"
] as const;
type ProjectTab = (typeof tabs)[number];
const projectTabRoutes: Record<ProjectTab, string> = {
  Architect: "architect",
  Changelog: "changelog",
  Modules: "modules",
  Notes: "notes",
  Overview: "overview",
  Reviews: "reviews",
  Schema: "schema",
  Tasks: "tasks",
  "White Board": "white-board"
};
type RecordEditorMode = { kind: "discussion" | "release" | "task"; noun: "architecture" | "change" | "note" | "task" };

export function ProjectOverviewSpace({
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
  const [activeTab, setActiveTab] = useState<ProjectTab>(readProjectTabRoute);
  const [records, setRecords] = useState<CoworkerProjectRecord[]>([]);
  const [editingIdea, setEditingIdea] = useState<CoworkerProjectRecord | null>(null);
  const [recordEditorMode, setRecordEditorMode] = useState<RecordEditorMode>({ kind: "discussion", noun: "note" });
  const [editingModule, setEditingModule] = useState<CoworkerRegistryModule | null>(null);
  const [editingArchitecture, setEditingArchitecture] = useState<CoworkerProjectRecord | null>(null);
  const [editingSchema, setEditingSchema] = useState<CoworkerProjectRecord | null>(null);
  const [moduleDrill, setModuleDrill] = useState<{ kind: ModuleDrillKind; module: CoworkerRegistryModule } | null>(null);
  const [whiteboardCreateRequest, setWhiteboardCreateRequest] = useState(0);
  const [moduleGroups, setModuleGroups] = useState<CoworkerRegistryGroup[]>([]);
  const [modules, setModules] = useState<CoworkerRegistryModule[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    updateProjectTabRoute(activeTab);
  }, [activeTab]);
  useEffect(() => {
    const restoreTab = () => setActiveTab(readProjectTabRoute());
    window.addEventListener("popstate", restoreTab);
    return () => window.removeEventListener("popstate", restoreTab);
  }, []);
  useEffect(() => {
    setLoading(true);
    void Promise.all(
      ["discussion", "issue", "kanban", "task", "activity", "review", "release", "timeline", "todo"].map((kind) =>
        client.projectRecords(kind)
      )
    )
      .then((groups) => setRecords(groups.flat()))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [client, project.id]);
  useEffect(() => {
    void client.registry().then((registry) => {
      const groups = registry.platforms.flatMap((platform) => flattenGroups(platform.groups));
      setModuleGroups(groups);
      setModules(groups.flatMap((group) => flattenModules(group.modules)));
    }).catch(() => { setModuleGroups([]); setModules([]); });
  }, [client]);
  const projectRecords = useMemo(
    () => records.filter((record) => belongsToProject(record, project, records)),
    [project, records]
  );
  if (editingIdea)
    return (
      <ProjectIdeaEditor
        client={client}
        idea={editingIdea}
        noun={recordEditorMode.noun}
        project={project}
        recordKind={recordEditorMode.kind}
        onBack={() => setEditingIdea(null)}
        onSaved={(saved) => {
          setEditingIdea(saved);
          setRecords((current) => [saved, ...current.filter((record) => record.id !== saved.id)]);
        }}
      />
    );
  if (editingModule) return <ProjectModuleEditor client={client} groups={moduleGroups} module={editingModule} modules={modules} onBack={() => setEditingModule(null)} onSaved={(saved) => { setEditingModule(saved); setModules((current) => [saved, ...current.filter((entry) => entry.id !== saved.id)]); }} />;
  if (moduleDrill) return <ProjectModuleDrilldown kind={moduleDrill.kind} module={moduleDrill.module} onBack={() => setModuleDrill(null)} onKindChange={(kind) => setModuleDrill((current) => current ? { ...current, kind } : null)} records={projectRecords} />;
  const designing = Boolean(editingArchitecture || editingSchema);
  return (
    <section className={`project-overview-space${activeTab === "White Board" ? " whiteboard-active" : ""}`}>
      <div className="project-overview-toolbar">
        <nav aria-label="Project workspace views" className="project-overview-tabs">
          {tabs.map((tab) => (
            <button
              aria-current={activeTab === tab ? "page" : undefined}
              key={tab}
              onClick={() => { setActiveTab(tab); setEditingArchitecture(null); setEditingSchema(null); }}
              type="button"
            >
              {tab}
            </button>
          ))}
        </nav>
        <div className="project-overview-toolbar-actions">
          {!designing && canAdd(activeTab) ? <button className="project-overview-add" disabled={activeTab === "Modules" && !moduleGroups.length} onClick={startAdd} title={activeTab === "Modules" && !moduleGroups.length ? "Create a registry group before adding a module" : `Add ${addLabel(activeTab)}`} type="button"><Plus size={15} /> Add {addLabel(activeTab)}</button> : null}
          <ProjectOverviewActions client={client} onArchived={onArchived} onUpdated={onUpdated} project={project} />
        </div>
      </div>
      {editingArchitecture ? <ProjectArchitecturePlanner client={client} onBack={() => setEditingArchitecture(null)} onSaved={(saved) => { setRecords((current) => [saved, ...current.filter((entry) => entry.id !== saved.id)]); setEditingArchitecture(null); }} project={project} record={editingArchitecture} /> : editingSchema ? <ProjectArchitecturePlanner client={client} mode="schema" onBack={() => setEditingSchema(null)} onSaved={(saved) => { setRecords((current) => [saved, ...current.filter((entry) => entry.id !== saved.id)]); setEditingSchema(null); }} project={project} record={editingSchema} /> : <ProjectTabContent
        activeTab={activeTab}
        loading={loading}
        client={client}
        onEditIdea={(record) => { setRecordEditorMode(record.kind === "release" ? { kind: "release", noun: "change" } : { kind: "discussion", noun: "note" }); setEditingIdea(record); }}
        modules={modules}
        onEditModule={setEditingModule}
        onModuleDrill={(module, kind) => setModuleDrill({ kind, module })}
        onEditArchitecture={setEditingArchitecture}
        onEditSchema={setEditingSchema}
        onRemoveNote={(note) => setRecords((current) => current.filter((record) => record.id !== note.id))}
        project={project}
        records={projectRecords}
        whiteboardCreateRequest={whiteboardCreateRequest}
      />}
    </section>
  );

  function startAdd() {
    if (activeTab === "Modules") { if (moduleGroups[0]) setEditingModule(newModule(moduleGroups[0].id)); return; }
    if (activeTab === "Tasks") { setRecordEditorMode({ kind: "task", noun: "task" }); setEditingIdea(newRecord("task", "general")); return; }
    if (activeTab === "White Board") { setWhiteboardCreateRequest((current) => current + 1); return; }
    if (activeTab === "Changelog") { setRecordEditorMode({ kind: "release", noun: "change" }); setEditingIdea(newRecord("release", "feature")); return; }
    if (activeTab === "Architect") { setEditingArchitecture(newRecord("discussion", "architecture")); return; }
    if (activeTab === "Schema") { setEditingSchema(newRecord("discussion", "schema")); return; }
    setRecordEditorMode({ kind: "discussion", noun: "note" });
    setEditingIdea(newRecord("discussion", "general"));
  }
}

function readProjectTabRoute(): ProjectTab {
  if (typeof window === "undefined") return "Overview";
  const route = new URLSearchParams(window.location.search).get("tab");
  return (
    (Object.entries(projectTabRoutes).find(([, name]) => name === route)?.[0] as
      | ProjectTab
      | undefined) ?? "Overview"
  );
}

function updateProjectTabRoute(tab: ProjectTab) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("tab", projectTabRoutes[tab]);
  window.history.replaceState(window.history.state, "", url);
}

function ProjectTabContent({
  activeTab,
  client,
  loading,
  onEditIdea,
  onEditArchitecture,
  onEditSchema,
  modules,
  onEditModule,
  onModuleDrill,
  onRemoveNote,
  project,
  records,
  whiteboardCreateRequest
}: {
  activeTab: ProjectTab;
  client: CoworkerClient;
  loading: boolean;
  onEditIdea: (idea: CoworkerProjectRecord) => void;
  onEditArchitecture: (record: CoworkerProjectRecord) => void;
  onEditSchema: (record: CoworkerProjectRecord) => void;
  modules: CoworkerRegistryModule[];
  onEditModule: (module: CoworkerRegistryModule) => void;
  onModuleDrill: (module: CoworkerRegistryModule, kind: ModuleDrillKind) => void;
  onRemoveNote: (note: CoworkerProjectRecord) => void;
  project: CoworkerProject;
  records: CoworkerProjectRecord[];
  whiteboardCreateRequest: number;
}) {
  if (loading) return <Empty text="Loading project details…" />;
  if (activeTab === "Overview") return <Overview client={client} modules={modules} project={project} records={records} />;
  if (activeTab === "Notes")
    return (
      <ProjectNotesList
        client={client}
        notes={records.filter((record) => record.kind === "discussion" && !["architecture", "schema"].includes(record.type || ""))}
        onEdit={onEditIdea}
        onRemoved={onRemoveNote}
      />
    );
  if (activeTab === "Modules")
    return <ProjectModulesList modules={modules} onDrill={onModuleDrill} onEdit={onEditModule} />;
  if (activeTab === "Tasks")
    return (
      <ProjectWorkList empty="No pending project tasks" kind="task" records={pendingTasks(records)} />
    );
  if (activeTab === "Reviews")
    return (
      <ProjectWorkList empty="No project reviews" kind="review" records={records.filter((record) => record.kind === "review")} />
    );
  if (activeTab === "Architect") return <ProjectWorkList empty="No architecture records" kind="architecture" onOpen={onEditArchitecture} records={records.filter((record) => record.kind === "discussion" && record.type === "architecture")} />;
  if (activeTab === "White Board") {
    return (
      <Suspense fallback={<section className="project-whiteboard" aria-busy="true" />}>
        <ProjectWhiteBoard
          client={client}
          createRequest={whiteboardCreateRequest}
          project={project}
        />
      </Suspense>
    );
  }
  if (activeTab === "Schema") return <ProjectWorkList empty="No schema reviews" kind="schema" onOpen={onEditSchema} records={records.filter((record) => record.kind === "discussion" && record.type === "schema")} />;
  return <ProjectWorkList empty="No changelog entries" kind="changelog" onOpen={onEditIdea} records={records.filter((record) => record.kind === "release")} />;
}

function Overview({
  client,
  modules,
  project,
  records
}: {
  client: CoworkerClient;
  modules: CoworkerRegistryModule[];
  project: CoworkerProject;
  records: CoworkerProjectRecord[];
}) {
  const [whiteboards, setWhiteboards] = useState<number | null>(null);
  useEffect(() => { void client.planningBoards(project.id).then((boards) => setWhiteboards(boards.length)).catch(() => setWhiteboards(0)); }, [client, project.id]);
  const totals = [
    { count: modules.length, icon: Boxes, label: "Modules" },
    { count: records.filter((record) => record.kind === "task").length, icon: ListChecks, label: "Tasks" },
    { count: records.filter((record) => record.kind === "review").length, icon: ClipboardCheck, label: "Reviews" },
    { count: records.filter((record) => record.kind === "discussion" && record.type === "architecture").length, icon: Network, label: "Architectures" },
    { count: whiteboards, icon: PenTool, label: "Whiteboards" },
    { count: records.filter((record) => record.kind === "discussion" && record.type === "schema").length, icon: Database, label: "Schemas" },
    { count: records.filter((record) => record.kind === "release").length, icon: FileClock, label: "Changelog" }
  ];
  return (
    <div className="project-overview-layout">
      <div className="project-overview-main">
        <header><div><span>Project progress</span><strong>{project.title}</strong></div><article className="project-progress-card">
          <ProjectProgress value={projectProgress(project, records)} />
          <span>Progress</span></article></header>
        <section className="project-detail-list">
          <Row label="Project" value={project.title} />
          <Row label="Repository" value={project.repositoryName || project.key} />
          <Row label="Status" value={title(project.status || "active")} />
          <Row label="Module" value={project.moduleKey || "DevKit"} />
          <Row label="Workspace" value={project.referenceId || "Connected"} />
        </section>
      </div>
      <aside className="project-overview-stats" aria-label="Project workspace counts">
        <header><strong>Workspace</strong><span>Project counts</span></header>
        <div>{totals.map(({ count, icon: Icon, label }) => <article key={label}><span><Icon size={14} />{label}</span><strong>{count ?? "…"}</strong></article>)}</div>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="project-tab-state">{text}</p>;
}
function belongsToProject(record: CoworkerProjectRecord, project: CoworkerProject, records: CoworkerProjectRecord[]) {
  let current: CoworkerProjectRecord | undefined = record;
  const visited = new Set<string>();
  while (current?.referenceId && !visited.has(current.id)) {
    visited.add(current.id);
    if (current.referenceId === project.id || current.referenceId === project.key) return true;
    current = records.find((candidate) => candidate.id === current?.referenceId || candidate.key === current?.referenceId);
  }
  return false;
}
function flattenGroups(groups: CoworkerRegistryGroup[]): CoworkerRegistryGroup[] { return groups.flatMap((group) => [group, ...flattenGroups(group.subGroups)]); }
function flattenModules(modules: CoworkerRegistryModule[]): CoworkerRegistryModule[] { return modules.flatMap((module) => [module, ...flattenModules(module.children)]); }
function canAdd(tab: ProjectTab) { return ["Notes", "Modules", "Tasks", "Architect", "White Board", "Schema", "Changelog"].includes(tab); }
function addLabel(tab: ProjectTab) { if (tab === "Architect") return "architecture"; if (tab === "White Board") return "board"; if (tab === "Schema") return "schema"; if (tab === "Changelog") return "change"; return tab.slice(0, -1).toLowerCase(); }
function newRecord(kind: "discussion" | "release" | "task", type: string): CoworkerProjectRecord { return { description: "", id: `draft:${crypto.randomUUID()}`, key: "", kind, lane: "", referenceId: "", referenceType: "project", status: kind === "release" ? "draft" : "open", title: "", type }; }
function newModule(groupId: string): CoworkerRegistryModule { return { active: true, children: [], createdAt: "", description: "", documentation: {}, groupId, id: `draft:${crypto.randomUUID()}`, key: "", moduleType: "module", name: "", parentModuleId: "", planningNotes: [], routePath: "", sortOrder: 0, status: "active", updatedAt: "" }; }
function title(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}
