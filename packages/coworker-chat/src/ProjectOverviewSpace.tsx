import { useEffect, useMemo, useState } from "react";
import type { CoworkerClient } from "./client";
import type { CoworkerProject, CoworkerProjectRecord } from "./types";
import { ProjectIdeaEditor } from "./ProjectIdeaEditor";

const tabs = [
  "Overview",
  "Ideas",
  "Modules",
  "Tasks",
  "Actions",
  "Reviews",
  "Architect",
  "Chang log"
] as const;
type ProjectTab = (typeof tabs)[number];

export function ProjectOverviewSpace({
  client,
  project
}: {
  client: CoworkerClient;
  project: CoworkerProject;
}) {
  const [activeTab, setActiveTab] = useState<ProjectTab>("Overview");
  const [records, setRecords] = useState<CoworkerProjectRecord[]>([]);
  const [editingIdea, setEditingIdea] = useState<CoworkerProjectRecord | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    void Promise.all(
      ["discussion", "task", "activity", "review", "release"].map((kind) =>
        client.projectRecords(kind)
      )
    )
      .then((groups) => setRecords(groups.flat()))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, [client, project.id]);
  const projectRecords = useMemo(
    () => records.filter((record) => belongsToProject(record, project)),
    [project, records]
  );
  if (editingIdea)
    return (
      <ProjectIdeaEditor
        client={client}
        idea={editingIdea}
        project={project}
        onBack={() => setEditingIdea(null)}
        onSaved={(saved) => {
          setEditingIdea(saved);
          setRecords((current) =>
            current.map((record) => (record.id === saved.id ? saved : record))
          );
        }}
      />
    );
  return (
    <section className="project-overview-space">
      <nav aria-label="Project workspace views" className="project-overview-tabs">
        {tabs.map((tab) => (
          <button
            aria-current={activeTab === tab ? "page" : undefined}
            key={tab}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </nav>
      <ProjectTabContent
        activeTab={activeTab}
        allRecords={records}
        loading={loading}
        onEditIdea={setEditingIdea}
        project={project}
        records={projectRecords}
      />
    </section>
  );
}

function ProjectTabContent({
  activeTab,
  allRecords,
  loading,
  onEditIdea,
  project,
  records
}: {
  activeTab: ProjectTab;
  allRecords: CoworkerProjectRecord[];
  loading: boolean;
  onEditIdea: (idea: CoworkerProjectRecord) => void;
  project: CoworkerProject;
  records: CoworkerProjectRecord[];
}) {
  if (loading) return <Empty text="Loading project details…" />;
  if (activeTab === "Overview") return <Overview project={project} records={records} />;
  if (activeTab === "Ideas")
    return (
      <IdeaList
        globalIdeas={allRecords.filter(
          (record) => record.kind === "discussion" && !record.referenceId
        )}
        ideas={records.filter((record) => record.kind === "discussion")}
        onEdit={onEditIdea}
      />
    );
  if (activeTab === "Modules")
    return (
      <SimpleList empty="No additional modules are linked." records={[moduleRecord(project)]} />
    );
  if (activeTab === "Tasks")
    return (
      <SimpleList
        empty="No project tasks yet."
        records={records.filter((record) => record.kind === "task")}
      />
    );
  if (activeTab === "Actions")
    return (
      <SimpleList
        empty="No project actions yet."
        records={records.filter((record) => record.kind === "activity")}
      />
    );
  if (activeTab === "Reviews")
    return (
      <SimpleList
        empty="No project reviews yet."
        records={records.filter((record) => record.kind === "review")}
      />
    );
  if (activeTab === "Architect") return <Architecture project={project} />;
  return (
    <SimpleList
      empty="No changelog entries yet."
      records={records.filter((record) => record.kind === "release")}
    />
  );
}

function Overview({
  project,
  records
}: {
  project: CoworkerProject;
  records: CoworkerProjectRecord[];
}) {
  const totals = [
    ["Ideas", "discussion"],
    ["Tasks", "task"],
    ["Actions", "activity"],
    ["Reviews", "review"]
  ] as const;
  return (
    <div className="project-tab-content">
      <div className="project-overview-metrics">
        {totals.map(([label, kind]) => (
          <article key={label}>
            <strong>{records.filter((item) => item.kind === kind).length}</strong>
            <span>{label}</span>
          </article>
        ))}
      </div>
      <section className="project-detail-list">
        <Row label="Project" value={project.title} />
        <Row label="Repository" value={project.repositoryName || project.key} />
        <Row label="Status" value={title(project.status || "active")} />
        <Row label="Module" value={project.moduleKey || "DevKit"} />
        <Row label="Workspace" value={project.referenceId || "Connected"} />
      </section>
    </div>
  );
}

function IdeaList({
  globalIdeas,
  ideas,
  onEdit
}: {
  globalIdeas: CoworkerProjectRecord[];
  ideas: CoworkerProjectRecord[];
  onEdit: (idea: CoworkerProjectRecord) => void;
}) {
  if (!ideas.length)
    return (
      <Empty text="No project ideas yet. Project ideas can link to an existing global idea." />
    );
  return (
    <div className="project-record-list project-idea-list">
      {ideas.map((idea, index) => {
        const linked = globalIdeas.find((global) => idea.lane === `global:${global.id}`);
        return (
          <article
            key={idea.id}
            onClick={() => onEdit(idea)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") onEdit(idea);
            }}
            role="button"
            tabIndex={0}
          >
            <div>
              <div className="project-idea-title">
                <small>{idea.key || ideas.length - index}</small>
                <strong>{idea.title}</strong>
                <em>{title(idea.type || "General")}</em>
              </div>
              <p>{idea.description || "No short description provided."}</p>
              {linked ? (
                <small className="project-idea-global">Linked global idea · {linked.title}</small>
              ) : null}
            </div>
            <span>{title(idea.status || "Open")}</span>
          </article>
        );
      })}
    </div>
  );
}

function SimpleList({ empty, records }: { empty: string; records: CoworkerProjectRecord[] }) {
  return records.length ? (
    <div className="project-record-list">
      {records.map((record) => (
        <article key={record.id}>
          <div>
            <strong>{record.title}</strong>
            <p>{record.description || "No details added."}</p>
          </div>
          <span>{title(record.status || "active")}</span>
        </article>
      ))}
    </div>
  ) : (
    <Empty text={empty} />
  );
}
function Architecture({ project }: { project: CoworkerProject }) {
  return (
    <section className="project-detail-list">
      <Row label="Application boundary" value={project.moduleKey || "Project module"} />
      <Row label="Source" value={project.repositoryName || "Repository not connected"} />
      <Row label="Workspace mode" value={project.referenceType || "Local workspace"} />
      <Row label="Technical key" value={project.key} />
    </section>
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
function belongsToProject(record: CoworkerProjectRecord, project: CoworkerProject) {
  return record.referenceId === project.id || record.referenceId === project.key;
}
function moduleRecord(project: CoworkerProject): CoworkerProjectRecord {
  return {
    description: project.description,
    id: `module:${project.moduleKey}`,
    kind: "module",
    lane: "",
    referenceId: project.id,
    status: "active",
    title: project.moduleKey || "DevKit"
  };
}
function title(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}
