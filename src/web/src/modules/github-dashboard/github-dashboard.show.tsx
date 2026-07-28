import {
  Button,
  WorkspaceDetailTable,
  WorkspaceShowCard,
  WorkspaceShowLayout,
  WorkspaceStatusBadge,
} from "@codexsun/ui";
import { ArrowLeft, ExternalLink, RefreshCw } from "lucide-react";
import type { GithubProjectDetails } from "./github-dashboard.types";

export function GithubProjectShow({
  isRefreshing,
  onBack,
  onRefresh,
  project,
}: {
  isRefreshing: boolean;
  onBack: () => void;
  onRefresh: () => void;
  project: GithubProjectDetails;
}) {
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button icon={<ArrowLeft />} onClick={onBack} variant="ghost">
            Back to projects
          </Button>
          <h2 className="mt-3 text-xl font-semibold">{project.name}</h2>
          <p className="text-sm text-muted-foreground">
            {project.packageDescription ??
              project.repositorySlug ??
              "Repository details"}
          </p>
        </div>
        <Button
          disabled={isRefreshing}
          icon={<RefreshCw className={isRefreshing ? "animate-spin" : ""} />}
          onClick={onRefresh}
          variant="outline"
        >
          Refresh
        </Button>
      </div>

      <WorkspaceShowLayout>
        <div className="grid gap-4">
          <WorkspaceShowCard title="Repository">
            <WorkspaceDetailTable
              rows={[
                ["Project", project.name],
                ["GitHub repository", project.repositorySlug],
                ["Branch", project.branch || null],
                ["Upstream", project.upstream],
                ["Status", <ProjectStatus key="status" project={project} />],
                [
                  "Ahead / behind",
                  `${project.ahead ?? "?"} / ${project.behind ?? "?"}`,
                ],
                ["Changed files", String(project.changedFiles)],
              ]}
            />
          </WorkspaceShowCard>
          <WorkspaceShowCard title="Version information">
            <WorkspaceDetailTable
              rows={[
                ["Local version", project.revision],
                ["Remote version", project.remoteRevision],
                ["Package name", project.packageName],
                ["package.json version", project.packageVersion],
                ["Changelog version", project.changelogVersion],
              ]}
            />
          </WorkspaceShowCard>
          <WorkspaceShowCard title="Latest commit">
            <WorkspaceDetailTable
              rows={[
                ["Subject", project.lastCommitSubject],
                [
                  "Committed",
                  project.lastCommitAt
                    ? new Date(project.lastCommitAt).toLocaleString()
                    : null,
                ],
              ]}
            />
          </WorkspaceShowCard>
        </div>
        <div className="grid content-start gap-4">
          <WorkspaceShowCard
            title={`Changed files (${project.changedFileNames.length})`}
          >
            {project.changedFileNames.length ? (
              <ul className="max-h-[32rem] divide-y overflow-auto text-sm">
                {project.changedFileNames.map((fileName) => (
                  <li className="break-all px-3 py-2.5" key={fileName}>
                    {fileName}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                The working tree has no changed files.
              </p>
            )}
          </WorkspaceShowCard>
          {project.githubUrl ? (
            <a
              className="inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium text-primary"
              href={project.githubUrl}
              rel="noreferrer"
              target="_blank"
            >
              Open repository on GitHub <ExternalLink className="size-4" />
            </a>
          ) : null}
        </div>
      </WorkspaceShowLayout>
    </>
  );
}

function ProjectStatus({ project }: { project: GithubProjectDetails }) {
  return (
    <WorkspaceStatusBadge
      label={
        project.status === "healthy"
          ? "Synchronized"
          : project.status === "changed"
            ? "Changed"
            : project.status === "attention"
              ? "Needs attention"
              : "Unavailable"
      }
      tone={
        project.status === "healthy"
          ? "success"
          : project.status === "changed"
            ? "warning"
            : "danger"
      }
    />
  );
}
