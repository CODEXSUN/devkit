import { useMemo, useState } from "react";
import { ArrowRightIcon, MapIcon } from "lucide-react";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import { useProjectManagerRecordsQuery } from "../project-manager/project-manager.hooks";
import type { ProjectManagerRecord } from "../project-manager/project-manager.types";
import { WorkAutomationWorkspace } from "../work-automation";
import { WorkShell } from "./work-navigation";

export function ProjectScopedRoadmapWorkspace() {
  const [issueId, setIssueId] = useState(() => routeIssueId());
  const projects = useProjectManagerRecordsQuery("project");
  const issues = useProjectManagerRecordsQuery("issue");
  const fromProjectReview = Boolean(
    new URLSearchParams(window.location.search).get("reviewParent")
  );

  if (issueId) {
    return (
      <WorkShell current="Roadmap">
        <WorkAutomationWorkspace
          initialView="roadmap"
          {...(!fromProjectReview
            ? {
                onRoadmapBack: () => {
                  window.history.pushState({ page: "roadmap-list" }, "", "/app/devkit/roadmap");
                  setIssueId("");
                }
              }
            : {})}
        />
      </WorkShell>
    );
  }

  return (
    <RoadmapCatalog
      issues={issues.data ?? []}
      loading={issues.isLoading || projects.isLoading}
      projects={projects.data ?? []}
      onOpen={(id) => {
        window.history.pushState(
          { issueId: id, page: "roadmap" },
          "",
          `/app/devkit/roadmap?issue=${encodeURIComponent(id)}`
        );
        setIssueId(id);
      }}
    />
  );
}

function RoadmapCatalog({
  issues,
  loading,
  onOpen,
  projects
}: {
  issues: ProjectManagerRecord[];
  loading: boolean;
  onOpen: (id: string) => void;
  projects: ProjectManagerRecord[];
}) {
  const groups = useMemo(
    () =>
      groupByProject(
        issues.filter((issue) => issue.active),
        projects
      ),
    [issues, projects]
  );
  return (
    <WorkShell current="Roadmap">
      <main className="mx-auto w-full max-w-7xl px-5 py-8 lg:px-8">
        <header className="border-b pb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Roadmaps</h1>
          <p className="pt-2 text-base text-muted-foreground">
            Every project initiative roadmap. Open a card to inspect its hierarchy, reviews, Kanban,
            Gantt, and delivery statistics.
          </p>
        </header>
        {loading ? (
          <p className="py-10 text-sm text-muted-foreground">Loading roadmaps...</p>
        ) : null}
        {!loading && !groups.length ? (
          <p className="py-12 text-sm text-muted-foreground">
            No initiative roadmaps are available.
          </p>
        ) : null}
        {groups.map((group) => (
          <section className="border-b py-7" key={group.id}>
            <div className="flex items-end justify-between gap-4 pb-4">
              <div>
                <h2 className="text-lg font-semibold">{group.title}</h2>
                <p className="pt-1 font-mono text-xs text-muted-foreground">{group.key}</p>
              </div>
              <span className="text-sm text-muted-foreground">{group.records.length} roadmaps</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {group.records.map((issue) => (
                <button
                  className="group flex min-h-44 cursor-pointer flex-col rounded-xl border bg-card p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  key={issue.id}
                  onClick={() => onOpen(issue.id)}
                  type="button"
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <MapIcon className="size-4" />
                    </span>
                    <WorkspaceStatusBadge label={label(issue.status)} tone={tone(issue.status)} />
                  </div>
                  <p className="pt-4 font-mono text-xs text-muted-foreground">{issue.key}</p>
                  <h3 className="pt-1 font-semibold group-hover:text-primary">{issue.title}</h3>
                  <div className="mt-auto flex w-full items-center justify-between gap-3 pt-4 text-sm text-muted-foreground">
                    <span>{issue.assignee || "Unassigned"}</span>
                    <ArrowRightIcon className="size-4 text-primary" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}
      </main>
    </WorkShell>
  );
}

function routeIssueId() {
  return new URLSearchParams(window.location.search).get("issue") ?? "";
}
function groupByProject(records: ProjectManagerRecord[], projects: ProjectManagerRecord[]) {
  const groups = new Map<
    string,
    { id: string; key: string; records: ProjectManagerRecord[]; title: string }
  >();
  for (const record of records) {
    const project = projects.find(
      (item) => item.id === record.referenceId || item.key === record.referenceId
    );
    const id = project?.id ?? "unassigned";
    const group = groups.get(id) ?? {
      id,
      key: project?.key ?? "NO-PROJECT",
      records: [],
      title: project?.title ?? "Unassigned project"
    };
    group.records.push(record);
    groups.set(id, group);
  }
  return [...groups.values()].sort((a, b) => a.title.localeCompare(b.title));
}
function label(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
function tone(status: string): "danger" | "info" | "success" | "warning" {
  if (status === "blocked") return "danger";
  if (status === "completed") return "success";
  if (status === "in-progress") return "info";
  return "warning";
}
