import {
  Button,
  Card,
  CardContent,
  WorkspacePage,
  WorkspaceStatusBadge,
  WorkspaceTableEmptyState,
  WorkspaceTablePanel,
} from "@codexsun/ui";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CalendarClockIcon,
  CheckCircle2Icon,
  GitBranchIcon,
  RefreshCwIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTodayDashboard } from "./today.hooks";
import type { TodayRecord, TodayRepository } from "./today.types";

export function TodayWorkspace() {
  const query = useTodayDashboard();
  const dashboard = query.data;
  const urgent =
    (dashboard?.overdueTasks.length ?? 0) +
    (dashboard?.blockedIssues.length ?? 0) +
    (dashboard?.waitingReviews.length ?? 0) +
    (dashboard?.failedChecks.length ?? 0);

  return (
    <WorkspacePage
      actions={
        <Button
          disabled={query.isFetching}
          icon={
            <RefreshCwIcon className={query.isFetching ? "animate-spin" : ""} />
          }
          onClick={() => void query.refetch()}
          variant="outline"
        >
          Refresh
        </Button>
      }
      description="Due work, blockers, reviews, repository health, checks, and releases requiring attention today."
      technicalName="devkit.today"
      title="Today"
    >
      {query.error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
          {query.error.message}
        </div>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={<AlertTriangleIcon />}
          label="Needs attention"
          value={urgent}
        />
        <Metric
          icon={<CalendarClockIcon />}
          label="Due today"
          value={dashboard?.dueTodayTasks.length ?? 0}
        />
        <Metric
          icon={<GitBranchIcon />}
          label="Changed repositories"
          value={dashboard?.changedRepositories.length ?? 0}
        />
        <Metric
          icon={<CheckCircle2Icon />}
          label="Upcoming releases"
          value={dashboard?.upcomingReleases.length ?? 0}
        />
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <RecordPanel
          empty="No overdue tasks."
          records={dashboard?.overdueTasks ?? []}
          title="Overdue tasks"
          tone="danger"
        />
        <RecordPanel
          empty="No tasks due today."
          records={dashboard?.dueTodayTasks ?? []}
          title="Tasks due today"
          tone="warning"
        />
        <RecordPanel
          empty="No blocked issues."
          records={dashboard?.blockedIssues ?? []}
          title="Blocked issues"
          tone="danger"
        />
        <RecordPanel
          empty="No reviews are waiting for approval."
          records={dashboard?.waitingReviews ?? []}
          title="Reviews waiting for approval"
          tone="warning"
        />
        <RepositoryPanel
          empty="No repositories have uncommitted changes."
          repositories={dashboard?.changedRepositories ?? []}
          title="Uncommitted changes"
        />
        <RepositoryPanel
          empty="All tracked branches are synchronized."
          repositories={dashboard?.repositorySync ?? []}
          title="Ahead or behind"
        />
        <RecordPanel
          empty="No failed build or test work is recorded."
          records={dashboard?.failedChecks ?? []}
          title="Failed builds or tests"
          tone="danger"
        />
        <RecordPanel
          empty="No upcoming releases have a target date."
          records={dashboard?.upcomingReleases ?? []}
          title="Upcoming releases"
          tone="info"
        />
      </div>
    </WorkspacePage>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            {label}
          </p>
          <strong className="text-2xl">{value}</strong>
        </div>
        <span className="text-primary [&_svg]:size-5">{icon}</span>
      </CardContent>
    </Card>
  );
}

function RecordPanel({
  empty,
  records,
  title,
  tone,
}: {
  empty: string;
  records: TodayRecord[];
  title: string;
  tone: "danger" | "info" | "warning";
}) {
  return (
    <AttentionPanel count={records.length} title={title} tone={tone}>
      {records.length ? (
        records.map((record) => (
          <AttentionRow
            detail={[
              label(record.kind),
              record.assignee || "Unassigned",
              formatDate(record.dueDate),
            ].join(" · ")}
            href={`/app/devkit/projects?kind=${record.kind}&record=${encodeURIComponent(record.id)}`}
            key={`${record.kind}:${record.id}`}
            status={label(record.status)}
            title={record.title}
            tone={tone}
          />
        ))
      ) : (
        <WorkspaceTableEmptyState className="py-8">
          {empty}
        </WorkspaceTableEmptyState>
      )}
    </AttentionPanel>
  );
}

function RepositoryPanel({
  empty,
  repositories,
  title,
}: {
  empty: string;
  repositories: TodayRepository[];
  title: string;
}) {
  return (
    <AttentionPanel count={repositories.length} title={title} tone="info">
      {repositories.length ? (
        repositories.map((repository) => (
          <AttentionRow
            detail={`${repository.branch || "No branch"} · ${repository.changedFiles} changed · ${repository.ahead ?? 0} ahead / ${repository.behind ?? 0} behind`}
            href={`/app/devkit/github?project=${encodeURIComponent(repository.name)}`}
            key={repository.name}
            status={
              repository.status === "healthy" ? "Synchronized" : "Attention"
            }
            title={repository.name}
            tone={
              repository.status === "attention" ||
              repository.status === "unavailable"
                ? "danger"
                : "warning"
            }
          />
        ))
      ) : (
        <WorkspaceTableEmptyState className="py-8">
          {empty}
        </WorkspaceTableEmptyState>
      )}
    </AttentionPanel>
  );
}

function AttentionPanel({
  children,
  count,
  title,
  tone,
}: {
  children: ReactNode;
  count: number;
  title: string;
  tone: "danger" | "info" | "warning";
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        <WorkspaceStatusBadge label={String(count)} tone={tone} />
      </div>
      <WorkspaceTablePanel>{children}</WorkspaceTablePanel>
    </section>
  );
}

function AttentionRow({
  detail,
  href,
  status,
  title,
  tone,
}: {
  detail: string;
  href: string;
  status: string;
  title: string;
  tone: "danger" | "info" | "warning";
}) {
  return (
    <div className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium">{title}</p>
          <WorkspaceStatusBadge label={status} tone={tone} />
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
      </div>
      <Button asChild size="sm" variant="outline">
        <a href={href}>
          Continue
          <ArrowRightIcon />
        </a>
      </Button>
    </div>
  );
}

function label(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
