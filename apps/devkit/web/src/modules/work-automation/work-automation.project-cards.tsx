import { formatDistanceToNow } from "date-fns";
import {
  ArchiveRestoreIcon,
  BanIcon,
  Clock3Icon,
  LinkIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
import { Button } from "@codexsun/ui/components/button";
import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import { WorkspaceRowActions } from "@codexsun/ui/workspace/row-actions";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import { WorkspaceTableEmptyState } from "@codexsun/ui/workspace/table";
import type { ProjectManagerRecord } from "../project-manager/project-manager.types";

type ProjectCardListProps = {
  loading: boolean;
  projects: ProjectManagerRecord[];
  records: ProjectManagerRecord[];
  onDeactivate(project: ProjectManagerRecord): void;
  onDelete(project: ProjectManagerRecord): void;
  onEdit(project: ProjectManagerRecord): void;
  onOpen(project: ProjectManagerRecord): void;
  onRestore(project: ProjectManagerRecord): void;
  onWhiteboards(project: ProjectManagerRecord): void;
};

export function ProjectCardList({
  loading,
  projects,
  records,
  onDeactivate,
  onDelete,
  onEdit,
  onOpen,
  onRestore,
  onWhiteboards,
}: ProjectCardListProps) {
  if (loading) return <GlobalLoader className="min-h-48" fullScreen={false} />;
  if (!projects.length) {
    return (
      <WorkspaceTableEmptyState>
        No projects found. Create a project to start planning the work.
      </WorkspaceTableEmptyState>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-7 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => {
        const summary = projectSummary(project, records);
        const visual = projectVisual(project);
        return (
          <article
            className="group flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-card transition-[transform,box-shadow,border-color] duration-200 ease-out hover:-translate-y-1 hover:border-primary/35 hover:shadow-md"
            key={project.id}
            role="link"
            tabIndex={0}
            onClick={() => onOpen(project)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onOpen(project);
              }
            }}
          >
            <div className={`flex h-[4.5rem] shrink-0 items-center gap-3 bg-gradient-to-b px-4 ${visual.gradient}`}>
              <div
                aria-label={`${project.title} logo`}
                className="grid size-11 shrink-0 place-items-center rounded-xl border bg-background/90 text-sm font-bold tracking-tight text-foreground shadow-sm backdrop-blur-sm"
              >
                {visual.mark}
              </div>
              <span className="font-mono text-xs font-medium text-foreground/70">{project.key}</span>
              <div className="ml-auto rounded-full bg-background/90 p-0.5 shadow-sm backdrop-blur-sm">
                <ProgressCircle value={summary.progress} />
              </div>
            </div>

            <div className="flex flex-1 flex-col p-4">
              <div className="min-w-0">
                <button
                  className="max-w-full text-left text-lg font-semibold leading-tight hover:text-primary"
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpen(project);
                  }}
                >
                  {project.title}
                </button>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {plainText(project.description) || "No project description added."}
                </p>
              </div>

              <div className="mt-4 rounded-lg bg-muted/45 px-3 py-2.5">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Clock3Icon className="size-3.5 shrink-0" />
                  Latest work
                </div>
                <div className="mt-1 flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{summary.latest.title}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(summary.latest.updatedAt), { addSuffix: true })}
                  </span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-4 gap-2" aria-label="Project state totals">
                <StateTotal label="Total" value={summary.total} />
                <StateTotal label="Active" value={summary.active} />
                <StateTotal label="Done" value={summary.completed} />
                <StateTotal label="Blocked" value={summary.blocked} tone="danger" />
              </div>

              <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                <div className="flex min-w-0 flex-col items-start gap-2">
                  <WorkspaceStatusBadge
                    label={project.active ? title(project.status) : "Inactive"}
                    tone={project.active ? statusTone(project.status) : "neutral"}
                  />
                  <div className="max-w-full truncate text-xs text-muted-foreground">
                    {project.assignee ? `Owner: ${project.assignee}` : "Owner not assigned"}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button size="sm" onClick={(event) => {
                    event.stopPropagation();
                    onOpen(project);
                  }}>
                    Open project
                  </Button>
                  <div onClick={(event) => event.stopPropagation()}>
                    <WorkspaceRowActions
                  title={project.title}
                  actions={[
                    {
                      id: "whiteboards",
                      label: "Whiteboards",
                      icon: <LinkIcon className="size-4" />,
                      onSelect: () => onWhiteboards(project),
                    },
                    {
                      id: "edit",
                      label: "Edit",
                      icon: <PencilIcon className="size-4" />,
                      onSelect: () => onEdit(project),
                    },
                    project.active
                      ? {
                          id: "deactivate",
                          label: "Deactivate",
                          icon: <BanIcon className="size-4" />,
                          onSelect: () => onDeactivate(project),
                        }
                      : {
                          id: "restore",
                          label: "Restore",
                          icon: <ArchiveRestoreIcon className="size-4" />,
                          onSelect: () => onRestore(project),
                        },
                    {
                      id: "delete",
                      label: "Delete",
                      icon: <Trash2Icon className="size-4" />,
                      tone: "destructive",
                      onSelect: () => onDelete(project),
                    },
                  ]}
                    />
                  </div>
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function projectSummary(project: ProjectManagerRecord, records: ProjectManagerRecord[]) {
  const descendants = records.filter((record) => belongsToProject(record, project, records));
  const completed = descendants.filter((record) => isCompleted(record.status)).length;
  const blocked = descendants.filter((record) => record.status === "blocked").length;
  const active = descendants.filter(
    (record) => record.active && !isCompleted(record.status) && record.status !== "blocked",
  ).length;
  const latest = [project, ...descendants].sort(
    (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
  )[0] ?? project;
  return {
    active,
    blocked,
    completed,
    latest,
    progress: descendants.length ? Math.round((completed / descendants.length) * 100) : projectProgress(project.status),
    total: descendants.length,
  };
}

function projectVisual(project: ProjectManagerRecord) {
  const fallback = project.title.trim().toLowerCase();
  const colorKey = project.colorKey || fallbackColor(fallback);
  return {
    gradient: projectGradient(colorKey),
    mark: project.logoText || fallbackMark(fallback) || initials(project.title),
  };
}

function projectGradient(colorKey: string) {
  if (colorKey === "violet") return "from-violet-400/35 via-violet-100/20 to-card";
  if (colorKey === "amber") return "from-amber-400/35 via-amber-100/20 to-card";
  if (colorKey === "blue") return "from-blue-400/35 via-blue-100/20 to-card";
  if (colorKey === "emerald") return "from-emerald-400/35 via-emerald-100/20 to-card";
  if (colorKey === "rose") return "from-rose-400/35 via-rose-100/20 to-card";
  if (colorKey === "indigo") return "from-indigo-400/35 via-indigo-100/20 to-card";
  return "from-slate-400/30 via-slate-100/15 to-card";
}

function fallbackColor(titleKey: string) {
  if (titleKey === "app.techmedia") return "violet";
  if (titleKey === "shop.techmedia") return "amber";
  if (titleKey === "cxapp") return "blue";
  if (titleKey === "tenkasi sports") return "emerald";
  if (titleKey === "tirupur connect") return "rose";
  if (titleKey === "cxshop") return "indigo";
  return "slate";
}

function fallbackMark(titleKey: string) {
  if (titleKey === "app.techmedia") return "TM";
  if (titleKey === "shop.techmedia") return "TS";
  if (titleKey === "cxapp") return "CX";
  if (titleKey === "tenkasi sports") return "TS";
  if (titleKey === "tirupur connect") return "TC";
  if (titleKey === "cxshop") return "CS";
  return "";
}

function initials(value: string) {
  const words = value.split(/[^a-z0-9]+/iu).filter(Boolean);
  if (words.length > 1) return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return value.replace(/[^a-z0-9]/giu, "").slice(0, 2).toUpperCase() || "PR";
}

function belongsToProject(
  record: ProjectManagerRecord,
  project: ProjectManagerRecord,
  records: ProjectManagerRecord[],
): boolean {
  let current: ProjectManagerRecord | undefined = record;
  const visited = new Set<string>();
  while (current?.referenceId && !visited.has(current.id)) {
    visited.add(current.id);
    if (
      current.referenceType === "project" &&
      (current.referenceId === project.id || current.referenceId === project.key)
    ) {
      return true;
    }
    current = records.find(
      (candidate) =>
        candidate.id === current?.referenceId || candidate.key === current?.referenceId,
    );
  }
  return false;
}

function ProgressCircle({ value }: { value: number }) {
  const progress = Math.max(0, Math.min(100, value));
  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative size-16 shrink-0" aria-label={`${progress}% complete`}>
      <svg className="size-16 -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" fill="none" r={radius} stroke="currentColor" strokeWidth="5" className="text-muted" />
        <circle
          cx="32"
          cy="32"
          fill="none"
          r={radius}
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress / 100)}
          strokeLinecap="round"
          strokeWidth="5"
          className="text-primary"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-xs font-semibold">{progress}%</span>
    </div>
  );
}

function StateTotal({ label, tone, value }: { label: string; tone?: "danger"; value: number }) {
  return (
    <div className="min-w-0">
      <div className={`text-lg font-semibold ${tone === "danger" && value ? "text-destructive" : ""}`}>{value}</div>
      <div className="truncate text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function isCompleted(status: string) {
  return ["approved", "completed", "done", "released"].includes(status);
}

function projectProgress(status: string) {
  if (isCompleted(status)) return 100;
  if (status === "in-progress") return 40;
  if (status === "approved") return 20;
  return 0;
}

function statusTone(status: string) {
  if (isCompleted(status)) return "success" as const;
  if (status === "blocked") return "danger" as const;
  if (status === "on-hold") return "warning" as const;
  return "info" as const;
}

function plainText(value: string) {
  return value.replace(/<[^>]*>/gu, " ").replace(/\s+/gu, " ").trim();
}

function title(value: string) {
  return value.replaceAll("-", " ").replace(/\b\w/gu, (letter) => letter.toUpperCase());
}
