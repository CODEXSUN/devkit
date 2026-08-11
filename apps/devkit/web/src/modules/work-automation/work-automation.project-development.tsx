import { formatDistanceToNow } from "date-fns";
import {
  ActivityIcon,
  BotIcon,
  CloudIcon,
  Code2Icon,
  FolderGit2Icon,
  GitCommitHorizontalIcon,
  LaptopIcon,
  NetworkIcon,
  PlayIcon,
  RefreshCwIcon
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@codexsun/ui/components/button";
import { WorkspaceAnimatedTabs } from "@codexsun/ui/workspace/animated-tabs";
import { WorkspaceStatusBadge } from "@codexsun/ui/workspace/status";
import { listAgentRuns, type AgentRunSummary } from "../agent-ide";
import { useGithubProject, type GithubProjectDetails } from "../github-dashboard";
import type { ProjectManagerRecord } from "../project-manager/project-manager.types";

export function ProjectDevelopmentTabs({
  overview,
  onConfigureWorkspace,
  project,
  records
}: {
  overview: ReactNode;
  onConfigureWorkspace(): void;
  project: ProjectManagerRecord;
  records: ProjectManagerRecord[];
}) {
  const [active, setActive] = useState("overview");
  const sourceReference =
    project.repositoryName ||
    (project.referenceType === "github"
      ? project.referenceId
      : project.repositoryName || project.title);
  const sourceName =
    sourceReference
      .split(/[\\/]/u)
      .filter(Boolean)
      .at(-1)
      ?.replace(/\.git$/u, "") ?? project.title;
  const source = useGithubProject(sourceName);
  const runs = useQuery({
    queryFn: () => listAgentRuns(project.id),
    queryKey: ["devkit", "project-development", project.id, "runs"],
    refetchInterval: 15_000
  });

  return (
    <WorkspaceAnimatedTabs
      value={active}
      onValueChange={setActive}
      tabs={[
        {
          content: overview,
          label: <TabLabel icon={Code2Icon} text="Overview" />,
          value: "overview"
        },
        {
          content: <WorkspaceTab onConfigureWorkspace={onConfigureWorkspace} project={project} />,
          label: <TabLabel icon={LaptopIcon} text="Workspace" />,
          value: "workspace"
        },
        {
          content: (
            <SourceTab
              loading={source.isLoading}
              project={project}
              source={source.data}
              onRefresh={() => void source.refetch()}
            />
          ),
          label: <TabLabel icon={FolderGit2Icon} text="Source" />,
          value: "source"
        },
        {
          content: <RunsTab loading={runs.isLoading} project={project} runs={runs.data ?? []} />,
          label: <TabLabel icon={PlayIcon} text="Runs" />,
          value: "runs"
        },
        {
          content: <ActivityTab project={project} records={records} />,
          label: <TabLabel icon={ActivityIcon} text="Activity" />,
          value: "activity"
        }
      ]}
    />
  );
}

function WorkspaceTab({
  onConfigureWorkspace,
  project
}: {
  onConfigureWorkspace(): void;
  project: ProjectManagerRecord;
}) {
  const connected = Boolean(project.referenceType && project.referenceId);
  const mode =
    project.referenceType === "github"
      ? "Cloud"
      : project.referenceType === "remote"
        ? "Remote / VPN"
        : "Local";
  if (!connected) {
    return (
      <section className="mx-auto grid min-h-[28rem] w-full max-w-4xl place-items-center rounded-xl border border-dashed bg-card p-8 text-center">
        <div className="max-w-2xl">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <FolderGit2Icon className="size-6" />
          </div>
          <h3 className="mt-5 text-xl font-semibold">Connect or create a workspace</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Choose where this project will be developed. Connect an existing repository or define
            the destination for a new scaffold.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <WorkspaceChoice
              icon={LaptopIcon}
              label="Local"
              detail="A folder or Git repository on this device."
            />
            <WorkspaceChoice
              icon={CloudIcon}
              label="Cloud"
              detail="A hosted Git repository and cloud workflow."
            />
            <WorkspaceChoice
              icon={NetworkIcon}
              label="Remote / VPN"
              detail="A secured remote machine or private network path."
            />
          </div>
          <Button className="mt-7" onClick={onConfigureWorkspace}>
            <FolderGit2Icon className="size-4" />
            Connect or create workspace
          </Button>
        </div>
      </section>
    );
  }
  return (
    <section className="mx-auto max-w-4xl rounded-xl border bg-card p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <WorkspaceStatusBadge label={`${mode} workspace connected`} tone="success" />
          <h3 className="mt-3 truncate text-lg font-semibold">{project.referenceId}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            This workspace is the development target for Project Agent runs.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onConfigureWorkspace}>
            Change workspace
          </Button>
          <Button
            onClick={() =>
              window.location.assign(
                `/app/devkit/agent-ide?project=${encodeURIComponent(project.id)}`
              )
            }
          >
            <BotIcon className="size-4" />
            Open Project Agent
          </Button>
        </div>
      </div>
    </section>
  );
}

function SourceTab({
  loading,
  onRefresh,
  project,
  source
}: {
  loading: boolean;
  onRefresh(): void;
  project: ProjectManagerRecord;
  source: GithubProjectDetails | undefined;
}) {
  if (loading)
    return (
      <PanelMessage
        title="Reading source status"
        detail="Checking the repository and version metadata."
      />
    );
  if (!source)
    return (
      <PanelMessage
        title="Source not connected"
        detail={`No GitHub Dashboard project currently matches ${project.title}.`}
      />
    );
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="rounded-xl border bg-card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold">Git status</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Live repository state from GitHub Dashboard.
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={onRefresh}>
            <RefreshCwIcon className="size-4" />
            Refresh
          </Button>
        </div>
        <dl className="mt-5 grid grid-cols-[9rem_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
          <SourceRow label="Repository" value={source.repositorySlug ?? "Local only"} />
          <SourceRow label="Branch" value={source.branch || "Unknown"} />
          <SourceRow label="Revision" value={source.revision?.slice(0, 12) ?? "Unknown"} />
          <SourceRow
            label="Ahead / behind"
            value={`${source.ahead ?? "?"} / ${source.behind ?? "?"}`}
          />
          <SourceRow label="Changed files" value={String(source.changedFiles)} />
        </dl>
      </section>
      <section className="rounded-xl border bg-card p-5">
        <h3 className="font-semibold">Version and latest commit</h3>
        <dl className="mt-5 grid grid-cols-[9rem_minmax(0,1fr)] gap-x-4 gap-y-3 text-sm">
          <SourceRow label="Package version" value={source.packageVersion ?? "Not detected"} />
          <SourceRow label="Changelog" value={source.changelogVersion ?? "Not detected"} />
          <SourceRow label="Commit" value={source.lastCommitSubject ?? "No commit available"} />
          <SourceRow
            label="Committed"
            value={source.lastCommitAt ? new Date(source.lastCommitAt).toLocaleString() : "Unknown"}
          />
        </dl>
      </section>
      {source.changedFileNames.length ? (
        <section className="rounded-xl border bg-card p-5 xl:col-span-2">
          <h3 className="font-semibold">Changed files</h3>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {source.changedFileNames.map((file) => (
              <div
                className="truncate rounded-md bg-muted/45 px-3 py-2 font-mono text-xs"
                key={file}
              >
                {file}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function RunsTab({
  loading,
  project,
  runs
}: {
  loading: boolean;
  project: ProjectManagerRecord;
  runs: AgentRunSummary[];
}) {
  if (loading)
    return (
      <PanelMessage
        title="Loading Agent runs"
        detail="Reading project-scoped orchestration evidence."
      />
    );
  return (
    <section className="rounded-xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Agent runs and commits</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Execution, verification, review, and commit history.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() =>
            window.location.assign(
              `/app/devkit/agent-ide?project=${encodeURIComponent(project.id)}`
            )
          }
        >
          New run
        </Button>
      </div>
      <div className="mt-5 divide-y">
        {runs.length ? (
          runs.slice(0, 12).map((run) => <RunRow key={run.uuid} run={run} />)
        ) : (
          <PanelMessage
            title="No Agent runs yet"
            detail="Open Project Agent to plan the scaffold and start development."
          />
        )}
      </div>
    </section>
  );
}

function ActivityTab({
  project,
  records
}: {
  project: ProjectManagerRecord;
  records: ProjectManagerRecord[];
}) {
  const recent = [
    project,
    ...records.filter((record) => belongsToProject(record, project, records))
  ]
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, 20);
  return (
    <section className="rounded-xl border bg-card p-5">
      <h3 className="font-semibold">Project activity</h3>
      <div className="mt-4 divide-y">
        {recent.map((record) => (
          <div className="flex items-center gap-3 py-3" key={`${record.kind}-${record.id}`}>
            <ActivityIcon className="size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{record.title}</div>
              <div className="text-xs text-muted-foreground">
                {displayKind(record.kind)} · {record.key}
              </div>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(record.updatedAt), { addSuffix: true })}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function WorkspaceChoice({
  detail,
  icon: Icon,
  label
}: {
  detail: string;
  icon: typeof LaptopIcon;
  label: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2">
        <Icon className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="mt-2 line-clamp-3 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}
function SourceRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 truncate font-medium">{value}</dd>
    </>
  );
}
function PanelMessage({ detail, title }: { detail: string; title: string }) {
  return (
    <div className="rounded-lg border border-dashed p-8 text-center">
      <div className="text-sm font-medium">{title}</div>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}
function TabLabel({ icon: Icon, text }: { icon: typeof Code2Icon; text: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Icon className="size-4" />
      {text}
    </span>
  );
}
function RunRow({ run }: { run: AgentRunSummary }) {
  return (
    <div className="flex items-center gap-3 py-3">
      <GitCommitHorizontalIcon className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{run.objective}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">
          {run.agentProfile} · {run.verificationStatus} · {run.reviewStatus}
        </div>
      </div>
      <WorkspaceStatusBadge
        label={run.status.replaceAll("_", " ")}
        tone={run.status === "completed" ? "success" : run.status === "failed" ? "danger" : "info"}
      />
      {run.commitHash ? (
        <span className="font-mono text-xs">{run.commitHash.slice(0, 8)}</span>
      ) : null}
    </div>
  );
}
function displayKind(kind: string) {
  return kind === "issue" ? "Initiative" : kind.charAt(0).toUpperCase() + kind.slice(1);
}
function belongsToProject(
  record: ProjectManagerRecord,
  project: ProjectManagerRecord,
  records: ProjectManagerRecord[]
) {
  let current: ProjectManagerRecord | undefined = record;
  const visited = new Set<string>();
  while (current?.referenceId && !visited.has(current.id)) {
    visited.add(current.id);
    if (
      current.referenceType === "project" &&
      [project.id, project.key].includes(current.referenceId)
    )
      return true;
    current = records.find(
      (item) => item.id === current?.referenceId || item.key === current?.referenceId
    );
  }
  return false;
}
