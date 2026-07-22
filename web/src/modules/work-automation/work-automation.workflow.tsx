import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CircleDotIcon,
  Clock3Icon,
  Layers3Icon
} from "lucide-react";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableHeaderCell,
  WorkspaceTablePanel
} from "@codexsun/ui/workspace/table";
import type { ProjectManagerRecord } from "../project-manager/project-manager.types";

export type WorkflowView = "automation" | "gantt" | "kanban" | "timeline";
export type WorkflowRecords = {
  activities: ProjectManagerRecord[];
  issues: ProjectManagerRecord[];
  reviews: ProjectManagerRecord[];
  tasks: ProjectManagerRecord[];
};

export function WorkAutomationMetrics({ records }: { records: WorkflowRecords }) {
  const all = flatten(records);
  const completed = all.filter((record) => doneStatuses.includes(record.status)).length;
  const blocked = all.filter((record) => record.status === "blocked").length;
  const overdue = all.filter((record) => isOverdue(record)).length;
  const completion = all.length ? Math.round((completed / all.length) * 100) : 0;
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Metric
        icon={Layers3Icon}
        label="All work"
        value={all.length}
        detail={`${records.issues.length} issues · ${records.tasks.length} tasks`}
      />
      <Metric
        icon={CircleDotIcon}
        label="In progress"
        value={
          all.filter((record) =>
            ["active", "assigned", "in-progress", "in-review"].includes(record.status)
          ).length
        }
        detail="Across the workflow"
      />
      <Metric
        icon={CheckCircle2Icon}
        label="Completion"
        value={`${completion}%`}
        detail={`${completed} completed`}
        tone="success"
      />
      <Metric
        icon={AlertTriangleIcon}
        label="Blocked"
        value={blocked}
        detail="Needs attention"
        tone={blocked ? "danger" : "neutral"}
      />
      <Metric
        icon={Clock3Icon}
        label="Overdue"
        value={overdue}
        detail="Open past target date"
        tone={overdue ? "danger" : "neutral"}
      />
    </div>
  );
}

export function WorkAutomationWorkflow({
  records,
  view
}: {
  records: WorkflowRecords;
  view: Exclude<WorkflowView, "automation">;
}) {
  const all = flatten(records);
  if (view === "timeline") return <Timeline records={all} />;
  if (view === "gantt") return <Gantt records={all} />;
  return <Kanban records={all} />;
}

function Timeline({ records }: { records: ProjectManagerRecord[] }) {
  const ordered = [...records].sort((left, right) => workDate(right).localeCompare(workDate(left)));
  return (
    <div className="rounded-md border bg-card p-5 shadow-sm">
      <div className="mb-5">
        <h3 className="font-semibold">Work timeline</h3>
        <p className="text-sm text-muted-foreground">
          Latest dated work across the complete automation chain.
        </p>
      </div>
      <div className="relative ml-2 border-l pl-6">
        {ordered.map((record) => (
          <div className="relative mb-6 last:mb-0" key={record.id}>
            <span className="absolute -left-[31px] top-1.5 size-3 rounded-full border-2 border-primary bg-background" />
            <div className="flex flex-wrap items-center gap-2">
              <KindBadge kind={record.kind} />
              <a className="font-medium hover:underline" href={automationLink(record)}>
                {record.title}
              </a>
              <WorkspaceStatusBadge label={pretty(record.status)} tone={tone(record.status)} />
            </div>
            <div className="mt-1 font-mono text-xs text-muted-foreground">
              {record.key} · {formatDate(workDate(record))}
            </div>
            {record.description ? (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                {plainText(record.description)}
              </p>
            ) : null}
          </div>
        ))}
        {!ordered.length ? (
          <WorkspaceTableEmptyState>No workflow records found.</WorkspaceTableEmptyState>
        ) : null}
      </div>
    </div>
  );
}

function Gantt({ records }: { records: ProjectManagerRecord[] }) {
  const dated = records.filter((record) => workDate(record));
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 15);
  const days = Array.from({ length: 46 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
  return (
    <WorkspaceTablePanel>
      <table className="w-full min-w-[1180px] table-fixed text-sm">
        <thead>
          <tr>
            <WorkspaceTableHeaderCell className="w-72">Work item</WorkspaceTableHeaderCell>
            <WorkspaceTableHeaderCell>45-day schedule</WorkspaceTableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {dated.map((record) => {
            const target = parseDate(workDate(record));
            const offset = clamp(
              Math.round((target.getTime() - start.getTime()) / 86400000),
              0,
              days.length - 1
            );
            const width = record.kind === "issue" ? 18 : record.kind === "task" ? 12 : 7;
            return (
              <tr className="border-b last:border-0" key={record.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <KindBadge kind={record.kind} />
                    <span className="truncate font-medium">{record.title}</span>
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">{record.key}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="relative h-8 rounded bg-muted/50">
                    <div
                      className="absolute top-1 h-6 rounded bg-primary/80 px-2 text-xs leading-6 text-primary-foreground"
                      style={{
                        left: `${(offset / days.length) * 100}%`,
                        maxWidth: "100%",
                        width: `${Math.max(5, (width / days.length) * 100)}%`
                      }}
                      title={`${record.title}: ${formatDate(workDate(record))}`}
                    >
                      {pretty(record.status)}
                    </div>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!dated.length ? (
        <WorkspaceTableEmptyState>
          Add target or activity dates to see the Gantt schedule.
        </WorkspaceTableEmptyState>
      ) : null}
    </WorkspaceTablePanel>
  );
}

function Kanban({ records }: { records: ProjectManagerRecord[] }) {
  const lanes = [
    { id: "open", label: "Open", statuses: ["open", "assigned", "requested"] },
    { id: "progress", label: "In progress", statuses: ["active", "in-progress", "in-review"] },
    {
      id: "attention",
      label: "Needs attention",
      statuses: ["blocked", "changes-requested", "needs-review"]
    },
    { id: "done", label: "Done", statuses: doneStatuses }
  ];
  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {lanes.map((lane) => {
        const items = records.filter((record) => lane.statuses.includes(record.status));
        return (
          <section className="min-h-72 rounded-md border bg-muted/20 p-3" key={lane.id}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold">{lane.label}</h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                {items.length}
              </span>
            </div>
            <div className="space-y-3">
              {items.map((record) => (
                <article className="rounded-md border bg-card p-3 shadow-sm" key={record.id}>
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <KindBadge kind={record.kind} />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(workDate(record))}
                    </span>
                  </div>
                  <div className="font-medium">{record.title}</div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">{record.key}</div>
                  {record.assignee ? (
                    <div className="mt-3 text-xs text-muted-foreground">{record.assignee}</div>
                  ) : null}
                </article>
              ))}
              {!items.length ? (
                <div className="rounded-md border border-dashed p-5 text-center text-sm text-muted-foreground">
                  No work
                </div>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

const doneStatuses = ["approved", "completed", "done", "released"];
function flatten(records: WorkflowRecords) {
  return [...records.issues, ...records.tasks, ...records.activities, ...records.reviews];
}
function workDate(record: ProjectManagerRecord) {
  return record.dueDate || record.updatedAt || record.createdAt;
}
function parseDate(value: string) {
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.valueOf()) ? new Date() : date;
}
function isOverdue(record: ProjectManagerRecord) {
  return Boolean(
    record.dueDate &&
    !doneStatuses.includes(record.status) &&
    parseDate(record.dueDate).getTime() < new Date().setHours(0, 0, 0, 0)
  );
}
function formatDate(value: string) {
  return value
    ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(
        parseDate(value)
      )
    : "No date";
}
function pretty(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
function plainText(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
function tone(status: string): "danger" | "info" | "success" | "warning" {
  return doneStatuses.includes(status)
    ? "success"
    : ["blocked", "changes-requested"].includes(status)
      ? "danger"
      : ["active", "in-progress", "in-review"].includes(status)
        ? "info"
        : "warning";
}
function KindBadge({ kind }: { kind: string }) {
  return (
    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
      {kind}
    </span>
  );
}
function automationLink(record: ProjectManagerRecord) {
  return `/sa/work-automation?kind=${encodeURIComponent(record.kind)}&record=${encodeURIComponent(record.id)}`;
}
function Metric({
  detail,
  icon: Icon,
  label,
  tone: metricTone = "neutral",
  value
}: {
  detail: string;
  icon: typeof Layers3Icon;
  label: string;
  tone?: "danger" | "neutral" | "success";
  value: number | string;
}) {
  return (
    <div className="rounded-md border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{label}</span>
        <Icon
          className={
            metricTone === "danger"
              ? "size-4 text-destructive"
              : metricTone === "success"
                ? "size-4 text-emerald-600"
                : "size-4"
          }
        />
      </div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
    </div>
  );
}
