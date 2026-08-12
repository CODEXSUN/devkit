import { BotIcon, CheckCircle2Icon, CircleDotIcon, Layers3Icon } from "lucide-react";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import {
  WorkspaceTableEmptyState,
  WorkspaceTableHeaderCell,
  WorkspaceTablePanel
} from "@codexsun/ui/workspace/table";
import type { ProjectManagerRecord } from "../project-manager/project-manager.types";

export type WorkflowView = "automation" | "gantt" | "kanban" | "reviews" | "roadmap" | "timeline";
export type WorkflowRecords = {
  activities: ProjectManagerRecord[];
  issues: ProjectManagerRecord[];
  projects: ProjectManagerRecord[];
  reviews: ProjectManagerRecord[];
  tasks: ProjectManagerRecord[];
};

export function RoadmapStatistics({ records }: { records: WorkflowRecords }) {
  const all = issueChildren(records);
  const completed = all.filter((record) => doneStatuses.includes(record.status)).length;
  const blocked = all.filter((record) => record.status === "blocked").length;
  const overdue = all.filter((record) => isOverdue(record)).length;
  const completion = percentage(completed, all.length);
  const inProgress = all.filter((record) =>
    ["active", "assigned", "in-progress", "in-review"].includes(record.status)
  ).length;
  const statistics = [
    {
      color: "var(--chart-1)",
      count: completed,
      label: "Completion",
      percentage: completion
    },
    {
      color: "var(--chart-2)",
      count: inProgress,
      label: "In progress",
      percentage: percentage(inProgress, all.length)
    },
    {
      color: "var(--chart-3)",
      count: records.tasks.length,
      label: "Tasks",
      percentage: percentage(records.tasks.length, all.length)
    },
    {
      color: "var(--chart-4)",
      count: records.activities.length,
      label: "Activities",
      percentage: percentage(records.activities.length, all.length)
    },
    {
      color: "var(--chart-5)",
      count: records.reviews.length,
      label: "Reviews",
      percentage: percentage(records.reviews.length, all.length)
    },
    {
      color: "var(--destructive)",
      count: blocked,
      label: "Blocked",
      percentage: percentage(blocked, all.length)
    },
    {
      color: "color-mix(in oklch, var(--chart-3), var(--destructive) 35%)",
      count: overdue,
      label: "Overdue",
      percentage: percentage(overdue, all.length)
    }
  ];
  return (
    <aside className="rounded-md border bg-card p-4 shadow-sm xl:sticky xl:top-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Initiative performance</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {all.length} work items · {completed} completed
          </p>
        </div>
        <WorkspaceStatusBadge
          label={`${formatPercentage(completion)} done`}
          tone={completion ? "success" : "info"}
        />
      </div>
      <ConcentricStatisticsChart statistics={statistics} total={all.length} />
    </aside>
  );
}

export function WorkAutomationWorkflow({
  records,
  view,
  onEditRecord,
  onAgentRecord
}: {
  records: WorkflowRecords;
  view: "gantt" | "kanban" | "reviews" | "timeline";
  onEditRecord: (record: ProjectManagerRecord) => void;
  onAgentRecord: (record: ProjectManagerRecord) => void;
}) {
  const all = flatten(records);
  if (view === "timeline")
    return (
      <DeliveryHierarchy
        records={records}
        onAgentRecord={onAgentRecord}
        onEditRecord={onEditRecord}
      />
    );
  if (view === "gantt")
    return (
      <Gantt
        onAgentRecord={onAgentRecord}
        records={all.filter((record) =>
          ["project", "issue", "task", "activity"].includes(record.kind)
        )}
      />
    );
  if (view === "reviews")
    return <ReviewStatus onAgentRecord={onAgentRecord} records={records.reviews} />;
  return <Kanban onAgentRecord={onAgentRecord} records={all} />;
}

function DeliveryHierarchy({
  records,
  onEditRecord,
  onAgentRecord
}: {
  records: WorkflowRecords;
  onEditRecord: (record: ProjectManagerRecord) => void;
  onAgentRecord: (record: ProjectManagerRecord) => void;
}) {
  const rows = buildHierarchyRows(records);
  return (
    <div>
      <div className="mb-4">
        <h3 className="font-semibold">Delivery hierarchy</h3>
        <p className="text-sm text-muted-foreground">
          Trace the selected initiative through its linked tasks, activities, and reviews.
        </p>
      </div>
      <WorkspaceTablePanel>
        <div className="overflow-x-auto">
          <table
            aria-label="Selected initiative delivery hierarchy"
            className="w-full min-w-[720px] table-fixed border-collapse text-sm"
          >
            <thead>
              <tr>
                <WorkspaceTableHeaderCell className="w-14 border text-center">
                  #
                </WorkspaceTableHeaderCell>
                <WorkspaceTableHeaderCell className="w-1/3 border">Task</WorkspaceTableHeaderCell>
                <WorkspaceTableHeaderCell className="w-1/3 border">
                  Activity
                </WorkspaceTableHeaderCell>
                <WorkspaceTableHeaderCell className="w-1/3 border">Review</WorkspaceTableHeaderCell>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.key}>
                  <td className="border bg-muted/10 px-3 py-3 text-center align-top text-xs text-muted-foreground">
                    {index + 1}
                  </td>
                  <HierarchyCell
                    cell={row.task}
                    emptyLabel="No tasks"
                    onEditRecord={onEditRecord}
                    onAgentRecord={onAgentRecord}
                  />
                  <HierarchyCell
                    cell={row.activity}
                    emptyLabel="No activities"
                    onEditRecord={onEditRecord}
                    onAgentRecord={onAgentRecord}
                  />
                  <HierarchyCell
                    cell={row.review}
                    emptyLabel="No reviews"
                    onEditRecord={onEditRecord}
                    onAgentRecord={onAgentRecord}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length ? (
          <WorkspaceTableEmptyState>No initiative workflow found.</WorkspaceTableEmptyState>
        ) : null}
      </WorkspaceTablePanel>
    </div>
  );
}

type HierarchyCellData = {
  record: ProjectManagerRecord;
  rowSpan: number;
};
type HierarchyRow = {
  activity?: HierarchyCellData | null;
  key: string;
  review?: HierarchyCellData | null;
  task?: HierarchyCellData | null;
};

function buildHierarchyRows(records: WorkflowRecords) {
  const rows: HierarchyRow[] = [];
  for (const issue of hierarchyOrder(records.issues)) {
    const tasks = hierarchyOrder(records.tasks.filter((task) => belongsTo(task, issue)));
    if (!tasks.length) {
      rows.push({
        activity: null,
        key: `${issue.id}:no-task`,
        review: null,
        task: null
      });
    }
    for (const task of tasks) {
      const taskStart = rows.length;
      const activities = hierarchyOrder(
        records.activities.filter((activity) => belongsTo(activity, task))
      );
      if (!activities.length) {
        rows.push({
          activity: null,
          key: `${issue.id}:${task.id}:no-activity`,
          review: null
        });
      }
      for (const activity of activities) {
        const activityStart = rows.length;
        const reviews = hierarchyOrder(
          records.reviews.filter((review) => belongsTo(review, activity))
        );
        if (!reviews.length) {
          rows.push({
            key: `${issue.id}:${task.id}:${activity.id}:no-review`,
            review: null
          });
        } else {
          for (const review of reviews) {
            rows.push({
              key: `${issue.id}:${task.id}:${activity.id}:${review.id}`,
              review: { record: review, rowSpan: 1 }
            });
          }
        }
        const activityRow = rows[activityStart];
        if (activityRow) {
          rows[activityStart] = {
            ...activityRow,
            activity: {
              record: activity,
              rowSpan: rows.length - activityStart
            }
          };
        }
      }
      const taskRow = rows[taskStart];
      if (taskRow) {
        rows[taskStart] = {
          ...taskRow,
          task: {
            record: task,
            rowSpan: rows.length - taskStart
          }
        };
      }
    }
  }
  return rows;
}

function HierarchyCell({
  cell,
  emptyLabel,
  onEditRecord,
  onAgentRecord
}: {
  cell: HierarchyCellData | null | undefined;
  emptyLabel: string;
  onEditRecord: (record: ProjectManagerRecord) => void;
  onAgentRecord: (record: ProjectManagerRecord) => void;
}) {
  if (cell === undefined) return null;
  if (cell === null) {
    return (
      <td className="border bg-muted/10 px-4 py-3 align-top text-sm text-muted-foreground">
        {emptyLabel}
      </td>
    );
  }
  return (
    <td className="border bg-card px-4 py-3 align-top" rowSpan={cell.rowSpan}>
      <button
        className="cursor-pointer text-left font-medium hover:underline"
        type="button"
        onClick={() => onEditRecord(cell.record)}
      >
        {cell.record.title}
      </button>
      <div className="mt-1 font-mono text-xs text-muted-foreground">{cell.record.key}</div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <WorkspaceStatusBadge label={pretty(cell.record.status)} tone={tone(cell.record.status)} />
        <AgentButton onSelect={() => onAgentRecord(cell.record)} />
      </div>
    </td>
  );
}

function hierarchyOrder(records: ProjectManagerRecord[]) {
  return [...records].sort(
    (left, right) =>
      left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)
  );
}

function belongsTo(child: ProjectManagerRecord, parent: ProjectManagerRecord) {
  return (
    child.referenceType === parent.kind &&
    (child.referenceId === parent.id || child.referenceId === parent.key)
  );
}

function Gantt({
  records,
  onAgentRecord
}: {
  records: ProjectManagerRecord[];
  onAgentRecord: (record: ProjectManagerRecord) => void;
}) {
  const dated = records.filter((record) => record.startDate || record.dueDate);
  const starts = dated.map((record) => parseDate(record.startDate || record.dueDate));
  const ends = dated.map((record) => parseDate(record.dueDate || record.startDate));
  const today = startOfDay(new Date());
  const start = starts.length
    ? new Date(Math.min(...starts.map((date) => date.getTime()), today.getTime()))
    : today;
  const rawEnd = ends.length
    ? new Date(Math.max(...ends.map((date) => date.getTime()), addDays(start, 30).getTime()))
    : addDays(start, 30);
  const end = new Date(Math.min(rawEnd.getTime(), addDays(start, 120).getTime()));
  const dayCount = Math.max(30, dateDiff(start, end) + 1);
  return (
    <WorkspaceTablePanel>
      <table className="w-full min-w-[1180px] table-fixed text-sm">
        <thead>
          <tr>
            <WorkspaceTableHeaderCell className="w-72">Work item</WorkspaceTableHeaderCell>
            <WorkspaceTableHeaderCell>{dayCount}-day initiative schedule</WorkspaceTableHeaderCell>
          </tr>
        </thead>
        <tbody>
          {dated.map((record) => {
            const itemStart = parseDate(record.startDate || record.dueDate);
            const itemEnd = parseDate(record.dueDate || record.startDate);
            const offset = clamp(dateDiff(start, itemStart), 0, dayCount - 1);
            const duration = clamp(dateDiff(itemStart, itemEnd) + 1, 1, dayCount - offset);
            return (
              <tr className="border-b last:border-0" key={record.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <KindBadge kind={record.kind} />
                    <span className="truncate font-medium">{record.title}</span>
                  </div>
                  <div className="mt-1 font-mono text-xs text-muted-foreground">{record.key}</div>
                  <div className="mt-2">
                    <AgentButton onSelect={() => onAgentRecord(record)} />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="relative h-8 rounded bg-muted/50">
                    <div
                      className="absolute top-1 h-6 rounded bg-primary/80 px-2 text-xs leading-6 text-primary-foreground"
                      style={{
                        left: `${(offset / dayCount) * 100}%`,
                        maxWidth: "100%",
                        width: `${Math.max(4, (duration / dayCount) * 100)}%`
                      }}
                      title={`${record.title}: ${formatDate(record.startDate || record.dueDate)} to ${formatDate(record.dueDate || record.startDate)}`}
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

function ReviewStatus({
  records,
  onAgentRecord
}: {
  records: ProjectManagerRecord[];
  onAgentRecord: (record: ProjectManagerRecord) => void;
}) {
  const statuses = ["requested", "in-review", "changes-requested", "approved"];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statuses.map((status) => (
          <Metric
            detail="Project review status"
            icon={status === "approved" ? CheckCircle2Icon : CircleDotIcon}
            key={status}
            label={pretty(status)}
            tone={
              status === "approved"
                ? "success"
                : status === "changes-requested"
                  ? "danger"
                  : "neutral"
            }
            value={records.filter((record) => record.status === status).length}
          />
        ))}
      </div>
      <WorkspaceTablePanel>
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr>
              <WorkspaceTableHeaderCell>Review</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell>Reviewer</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell>Due</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell>Status</WorkspaceTableHeaderCell>
              <WorkspaceTableHeaderCell>Agent</WorkspaceTableHeaderCell>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr className="border-b last:border-0" key={record.id}>
                <td className="px-4 py-3">
                  <div className="font-medium">{record.title}</div>
                  <div className="font-mono text-xs text-muted-foreground">{record.key}</div>
                </td>
                <td className="px-4 py-3">
                  <AgentButton onSelect={() => onAgentRecord(record)} />
                </td>
                <td className="px-4 py-3">{record.assignee || "Unassigned"}</td>
                <td className="px-4 py-3">{formatDate(record.dueDate)}</td>
                <td className="px-4 py-3">
                  <WorkspaceStatusBadge label={pretty(record.status)} tone={tone(record.status)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!records.length ? (
          <WorkspaceTableEmptyState>No initiative reviews found.</WorkspaceTableEmptyState>
        ) : null}
      </WorkspaceTablePanel>
    </div>
  );
}

function Kanban({
  records,
  onAgentRecord
}: {
  records: ProjectManagerRecord[];
  onAgentRecord: (record: ProjectManagerRecord) => void;
}) {
  const lanes = [
    { id: "open", label: "Open", statuses: ["open", "assigned", "requested"] },
    {
      id: "progress",
      label: "In progress",
      statuses: ["active", "in-progress", "in-review"]
    },
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
                  <div className="mt-3 flex justify-end">
                    <AgentButton onSelect={() => onAgentRecord(record)} />
                  </div>
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

function AgentButton({ onSelect }: { onSelect: () => void }) {
  return (
    <button
      aria-label="Open in Project Agent"
      className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md border text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
      onClick={onSelect}
      title="Open in Project Agent"
      type="button"
    >
      <BotIcon className="size-4" />
    </button>
  );
}
type RoadmapStatistic = {
  color: string;
  count: number;
  label: string;
  percentage: number;
};

function ConcentricStatisticsChart({
  statistics,
  total
}: {
  statistics: RoadmapStatistic[];
  total: number;
}) {
  return (
    <div>
      <div className="relative mx-auto size-64 max-w-full">
        <svg
          aria-label={statistics
            .map((statistic) => `${statistic.label}: ${formatPercentage(statistic.percentage)}`)
            .join(", ")}
          className="size-full"
          role="img"
          viewBox="0 0 240 240"
        >
          {statistics.map((statistic, index) => {
            const radius = 104 - index * 12;
            const circumference = 2 * Math.PI * radius;
            const offset =
              circumference -
              (Math.min(100, Math.max(0, statistic.percentage)) / 100) * circumference;
            return (
              <g key={statistic.label}>
                <circle
                  cx="120"
                  cy="120"
                  fill="none"
                  opacity="0.16"
                  r={radius}
                  stroke={statistic.color}
                  strokeWidth="8"
                />
                <circle
                  cx="120"
                  cy="120"
                  fill="none"
                  r={radius}
                  stroke={statistic.color}
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  strokeWidth="8"
                  transform="rotate(-90 120 120)"
                />
              </g>
            );
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="text-3xl font-semibold">{total}</div>
            <div className="text-xs text-muted-foreground">work items</div>
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-4">
        {statistics.map((statistic) => (
          <div className="min-w-0" key={statistic.label}>
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: statistic.color }}
              />
              <span className="truncate text-xs font-medium">{statistic.label}</span>
            </div>
            <div className="mt-1 pl-[18px] text-sm font-semibold">
              {formatPercentage(statistic.percentage)}
            </div>
            <div className="pl-[18px] text-[11px] text-muted-foreground">
              {statistic.count} {statistic.count === 1 ? "item" : "items"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function flatten(records: WorkflowRecords) {
  return [
    ...records.projects,
    ...records.issues,
    ...records.tasks,
    ...records.activities,
    ...records.reviews
  ];
}
function issueChildren(records: WorkflowRecords) {
  return [...records.tasks, ...records.activities, ...records.reviews];
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
    ? new Intl.DateTimeFormat("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).format(parseDate(value))
    : "No date";
}
function pretty(value: string) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
function addDays(value: Date, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}
function dateDiff(start: Date, end: Date) {
  return Math.round((startOfDay(end).getTime() - startOfDay(start).getTime()) / 86400000);
}
function startOfDay(value: Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
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
      {kind === "issue" ? "initiative" : kind}
    </span>
  );
}
function percentage(value: number, total: number) {
  return total ? Number(((value / total) * 100).toFixed(2)) : 0;
}
function formatPercentage(value: number) {
  return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value)}%`;
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
