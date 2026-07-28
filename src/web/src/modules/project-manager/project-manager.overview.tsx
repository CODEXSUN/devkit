import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CircleGaugeIcon,
  FolderKanbanIcon,
} from "lucide-react";
import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import { useProjectManagerRecordsQuery } from "./project-manager.hooks";
import type { ProjectManagerRecord } from "./project-manager.types";
import { SyncOverview } from "../sync";

export function ProjectManagerOverview({
  onOpenProject,
}: {
  onOpenProject: (projectId: string) => void;
}) {
  const projectsQuery = useProjectManagerRecordsQuery("project");
  const projects = projectsQuery.data ?? [];
  const activeProjects = projects.filter((project) => project.active);
  const completedProjects = activeProjects.filter((project) =>
    ["approved", "completed", "released"].includes(project.status),
  );
  const atRiskProjects = activeProjects.filter((project) =>
    ["blocked", "on-hold"].includes(project.status),
  );

  return (
    <main className="mx-auto w-[calc(100%-2rem)] max-w-[92rem] space-y-4 py-5 lg:w-[calc(100%-3rem)]">
      <section className="rounded-md border bg-card px-5 py-4 shadow-sm">
        <p className="text-sm font-semibold uppercase text-muted-foreground">
          Developer workspace
        </p>
        <h1 className="mt-1 text-2xl font-semibold">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A short view of every project and its current delivery status.
        </p>
      </section>

      <SyncOverview />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewMetric
          icon={FolderKanbanIcon}
          label="All projects"
          value={projects.length}
        />
        <OverviewMetric
          icon={CircleGaugeIcon}
          label="Active"
          value={activeProjects.length}
        />
        <OverviewMetric
          icon={AlertTriangleIcon}
          label="At risk"
          value={atRiskProjects.length}
        />
        <OverviewMetric
          icon={CheckCircle2Icon}
          label="Completed"
          value={completedProjects.length}
        />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold">Projects</h2>
            <p className="text-sm text-muted-foreground">
              Open a project to continue through its delivery timeline.
            </p>
          </div>
          <WorkspaceStatusBadge
            label={`${projects.length} ${projects.length === 1 ? "project" : "projects"}`}
            tone="info"
          />
        </div>

        {projectsQuery.isLoading ? (
          <div className="rounded-md border bg-card py-16">
            <GlobalLoader className="min-h-28" fullScreen={false} />
          </div>
        ) : null}
        {projectsQuery.error ? (
          <div className="rounded-md border border-destructive/40 bg-card p-4 text-sm text-destructive">
            {projectsQuery.error.message}
          </div>
        ) : null}
        {!projectsQuery.isLoading &&
        !projectsQuery.error &&
        !projects.length ? (
          <div className="rounded-md border bg-card p-8 text-center">
            <FolderKanbanIcon className="mx-auto size-8 text-muted-foreground" />
            <h3 className="mt-3 font-semibold">No projects yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Create the first project from the Projects workspace.
            </p>
          </div>
        ) : null}
        {projects.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={() => onOpenProject(project.id)}
              />
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}

function OverviewMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FolderKanbanIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border bg-card p-4 shadow-sm">
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-foreground">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-2xl font-semibold leading-none">{value}</p>
        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
      </div>
    </div>
  );
}

function ProjectCard({
  onOpen,
  project,
}: {
  onOpen: () => void;
  project: ProjectManagerRecord;
}) {
  return (
    <button
      className="group min-h-44 rounded-md border bg-card p-4 text-left shadow-sm transition hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      type="button"
      onClick={onOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <FolderKanbanIcon className="size-4" />
        </span>
        <WorkspaceStatusBadge
          label={project.active ? label(project.status) : "Inactive"}
          tone={project.active ? statusTone(project.status) : "neutral"}
        />
      </div>
      <p className="mt-4 font-mono text-xs text-muted-foreground">
        {project.key}
      </p>
      <h3 className="mt-1 font-semibold group-hover:text-primary">
        {project.title}
      </h3>
      <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-muted-foreground">
        {plainText(project.description) || "No project summary has been added."}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
        <span>{project.assignee || "Owner not assigned"}</span>
        <span>{formatDate(project.dueDate)}</span>
      </div>
    </button>
  );
}

function statusTone(status: string): "danger" | "info" | "success" | "warning" {
  if (["approved", "completed", "released"].includes(status)) return "success";
  if (["blocked", "on-hold"].includes(status)) return "danger";
  if (status === "in-progress") return "info";
  return "warning";
}

function label(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function plainText(value: string) {
  return value
    .replace(/<[^>]+>/gu, " ")
    .replace(/&nbsp;/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function formatDate(value: string) {
  if (!value) return "No target date";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(date);
}
