import { ArrowRightIcon, BotIcon, CheckIcon, TriangleAlertIcon } from "lucide-react";
import type { ReactNode } from "react";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import { useProjectManagerResultQuery } from "../project-manager/project-manager.hooks";
import type { ProjectManagerRecord } from "../project-manager/project-manager.types";
import { useTodayDashboard } from "../today/today.hooks";
import type { TodayRecord } from "../today/today.types";

export function DashboardWorkspace() {
  const todayQuery = useTodayDashboard();
  const projectQuery = useProjectManagerResultQuery();
  const today = todayQuery.data;
  const records = projectQuery.data?.records;
  const focus = [...(today?.overdueTasks ?? []), ...(today?.dueTodayTasks ?? [])].slice(0, 3);
  const attention =
    (today?.blockedIssues.length ?? 0) +
    (today?.waitingReviews.length ?? 0) +
    (today?.failedChecks.length ?? 0);
  const activeProjects = (records?.project ?? []).filter((record) => record.active);
  const projects = activeProjects.slice(0, 3);
  const activity = (records?.activity ?? [])
    .filter((record) => record.active)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 4);

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-8 lg:px-8">
      <header className="flex min-h-52 flex-col items-center justify-center border-b px-4 py-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Good morning, Sundar</h1>
        <p className="mt-3 text-base text-muted-foreground sm:text-lg">
          Here&apos;s what&apos;s happening across your engineering workspace
        </p>
      </header>

      {todayQuery.error || projectQuery.error ? (
        <div className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {todayQuery.error?.message ?? projectQuery.error?.message}
        </div>
      ) : null}

      <section className="grid grid-cols-2 border-b py-6 sm:grid-cols-4">
        <Metric href="/app/devkit/projects" label="Active projects" value={activeProjects.length} />
        <Metric
          href="/app/devkit/my-work?view=reviews"
          label="Reviews waiting"
          value={today?.waitingReviews.length ?? 0}
        />
        <Metric
          href="/app/devkit/github?view=checks"
          label="Builds failed"
          value={today?.failedChecks.length ?? 0}
        />
        <Metric
          href="/app/devkit/releases"
          label="Deploys pending"
          value={today?.upcomingReleases.length ?? 0}
        />
      </section>

      <div className="grid gap-x-12 gap-y-9 py-8 lg:grid-cols-2">
        <Section href="/app/devkit/my-work" title="My work">
          <RecordList empty="No task needs your focus today." records={focus} />
        </Section>

        <Section href="/app/devkit/github" title="Engineering health">
          <div className="divide-y rounded-lg border bg-card">
            <HealthRow
              good={!today?.failedChecks.length}
              href="/app/devkit/github?view=checks"
              label="Build checks"
              value={today?.failedChecks.length ? `${today.failedChecks.length} failed` : "Healthy"}
            />
            <HealthRow
              good={!today?.repositorySync.length}
              href="/app/devkit/github?view=sync"
              label="Repository sync"
              value={
                today?.repositorySync.length
                  ? `${today.repositorySync.length} behind or ahead`
                  : "Healthy"
              }
            />
            <HealthRow
              good={!today?.changedRepositories.length}
              href="/app/devkit/github?view=working-trees"
              label="Working trees"
              value={
                today?.changedRepositories.length
                  ? `${today.changedRepositories.length} changed`
                  : "Clean"
              }
            />
          </div>
        </Section>

        <Section href="/app/devkit/projects" title="Projects">
          <div className="divide-y rounded-lg border bg-card">
            {projects.length ? (
              projects.map((project) => <ProjectRow key={project.id} project={project} />)
            ) : (
              <Empty text="No active projects." />
            )}
          </div>
        </Section>

        <Section href="/app/devkit/my-work?view=activity" title="Recent activity">
          <div className="divide-y rounded-lg border bg-card">
            {activity.length ? (
              activity.map((record) => <ActivityRow key={record.id} record={record} />)
            ) : (
              <Empty text="No recent activity." />
            )}
          </div>
        </Section>
      </div>

      <section className="mb-4 rounded-xl border bg-card p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <BotIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">AI engineering assistant</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {attention
                ? `I found ${attention} work items that may need attention.`
                : "Your engineering workspace has no urgent recorded items."}
            </p>
            <div className="mt-3 flex gap-4 text-sm font-medium text-primary">
              <a className="hover:underline" href="/app/devkit/my-work">
                Review work
              </a>
              <a
                className="inline-flex items-center gap-1 hover:underline"
                href="/app/devkit/agent-ide"
              >
                Ask AI <ArrowRightIcon className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function Metric({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <a
      className="group border-r px-4 py-2 transition-colors last:border-r-0 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      href={href}
    >
      <strong className="text-2xl font-semibold">{value}</strong>
      <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground group-hover:text-foreground">
        {label} <ArrowRightIcon className="size-3" />
      </span>
    </a>
  );
}
function Section({ children, href, title }: { children: ReactNode; href: string; title: string }) {
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        <a className="text-xs font-medium text-primary hover:underline" href={href}>
          View all
        </a>
      </div>
      {children}
    </section>
  );
}
function RecordList({ empty, records }: { empty: string; records: TodayRecord[] }) {
  if (!records.length) return <Empty text={empty} />;
  return (
    <div className="divide-y rounded-lg border bg-card">
      {records.map((record) => (
        <a
          key={`${record.kind}:${record.id}`}
          className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
          href={recordHref(record)}
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{record.title}</span>
            <span className="text-xs text-muted-foreground">
              {label(record.priority)} · {label(record.status)}
            </span>
          </span>
          <ArrowRightIcon className="size-4 text-muted-foreground" />
        </a>
      ))}
    </div>
  );
}
function HealthRow({
  good,
  href,
  label: rowLabel,
  value
}: {
  good: boolean;
  href: string;
  label: string;
  value: string;
}) {
  const Icon = good ? CheckIcon : TriangleAlertIcon;
  return (
    <a className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40" href={href}>
      <span className="flex-1 text-sm">{rowLabel}</span>
      <span className="text-sm text-muted-foreground">{value}</span>
      <Icon className={`size-4 ${good ? "text-emerald-600" : "text-amber-600"}`} />
    </a>
  );
}
function ProjectRow({ project }: { project: ProjectManagerRecord }) {
  return (
    <a
      className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40"
      href={`/app/devkit/projects?project=${encodeURIComponent(project.id)}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{project.title}</span>
        <span className="text-xs text-muted-foreground">
          {project.assignee || "CODEXSUN Engineering"}
        </span>
      </span>
      <WorkspaceStatusBadge
        label={label(project.status)}
        tone={project.status === "blocked" ? "danger" : "success"}
      />
    </a>
  );
}
function ActivityRow({ record }: { record: ProjectManagerRecord }) {
  return (
    <a className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40" href={recordHref(record)}>
      <CheckIcon className="size-4 text-emerald-600" />
      <span className="min-w-0 flex-1 truncate text-sm">{record.title}</span>
      <span className="text-xs text-muted-foreground">{formatTime(record.updatedAt)}</span>
      <ArrowRightIcon className="size-3.5 text-muted-foreground" />
    </a>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
      {text}
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
function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? ""
    : new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short" }).format(date);
}

function recordHref(record: Pick<TodayRecord, "id" | "kind">) {
  const id = encodeURIComponent(record.id);
  if (record.kind === "task") return `/app/devkit/tasks?task=${id}`;
  if (record.kind === "issue") return `/app/devkit/issues?issue=${id}`;
  if (record.kind === "release") return `/app/devkit/releases?release=${id}`;
  if (record.kind === "project") return `/app/devkit/projects?project=${id}`;
  if (record.kind === "review") return `/app/devkit/my-work?view=reviews&record=${id}`;
  return `/app/devkit/my-work?view=activity&record=${id}`;
}
