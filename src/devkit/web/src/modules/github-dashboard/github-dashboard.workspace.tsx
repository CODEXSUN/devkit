import { Button, Card, CardContent, WorkspacePage } from "@codexsun/ui";
import {
  AlertTriangle,
  CheckCircle2,
  FolderGit2,
  RefreshCw,
} from "lucide-react";
import { useMemo, useState } from "react";
import { GithubDashboardList } from "./github-dashboard.list";
import { GithubProjectShow } from "./github-dashboard.show";
import { useGithubDashboard, useGithubProject } from "./github-dashboard.hooks";

export function GithubDashboardWorkspace() {
  const [selectedProject, setSelectedProject] = useState<string | null>(() =>
    new URLSearchParams(window.location.search).get("project"),
  );
  const dashboard = useGithubDashboard();
  const project = useGithubProject(selectedProject);
  const projects = dashboard.data?.projects ?? [];
  const summary = useMemo(
    () => ({
      changed: projects.filter((project) => project.status === "changed")
        .length,
      healthy: projects.filter((project) => project.status === "healthy")
        .length,
      needsAttention: projects.filter(
        (project) =>
          project.status === "attention" || project.status === "unavailable",
      ).length,
    }),
    [projects],
  );

  if (selectedProject) {
    return (
      <WorkspacePage
        description="Local and remote version, package metadata, changelog version, working-tree changes, and GitHub repository details."
        technicalName={`devkit.github-dashboard.${selectedProject}`}
        title="Repository Details"
      >
        {project.error ? (
          <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {project.error.message}
          </div>
        ) : null}
        {project.data ? (
          <GithubProjectShow
            isRefreshing={project.isFetching}
            onBack={() => {
              setSelectedProject(null);
              window.history.replaceState(
                { page: "github" },
                "",
                "/app/devkit/github",
              );
            }}
            onRefresh={() => void project.refetch()}
            project={project.data}
          />
        ) : null}
      </WorkspacePage>
    );
  }

  return (
    <WorkspacePage
      actions={
        <Button
          disabled={dashboard.isFetching}
          icon={
            <RefreshCw className={dashboard.isFetching ? "animate-spin" : ""} />
          }
          onClick={() => void dashboard.refetch()}
          variant="outline"
        >
          Refresh
        </Button>
      }
      description="GitHub connection, branch, synchronization, changes, and recent commit health for every CODEXSUN project."
      technicalName="devkit.github-dashboard"
      title="GitHub Dashboard"
    >
      {dashboard.error ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {dashboard.error.message}
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-3">
        <Metric
          icon={<FolderGit2 />}
          label="Projects"
          value={projects.length}
        />
        <Metric
          icon={<CheckCircle2 />}
          label="Synchronized"
          value={summary.healthy}
        />
        <Metric
          icon={<AlertTriangle />}
          label="Need attention"
          value={summary.changed + summary.needsAttention}
        />
      </div>
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <GithubDashboardList
            isLoading={dashboard.isLoading}
            onProjectOpen={(selected) => setSelectedProject(selected.name)}
            projects={projects}
          />
        </CardContent>
      </Card>
    </WorkspacePage>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
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
