import { WorkspaceStatusBadge, WorkspaceTable } from "@codexsun/ui";
import type { LegacyColumnDef as ColumnDef } from "@tanstack/react-table/legacy";
import { ExternalLink, FolderGit2 } from "lucide-react";
import type { GithubProjectState } from "./github-dashboard.types";

const columns: ColumnDef<GithubProjectState>[] = [
  {
    accessorKey: "name",
    header: "Project",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <FolderGit2 className="size-4 text-muted-foreground" />
        <div>
          <strong>{row.original.name}</strong>
          <p className="text-xs text-muted-foreground">
            {row.original.repositorySlug ?? "Local"}
          </p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "branch",
    header: "Branch",
    cell: ({ row }) => (
      <div>
        <p>{row.original.branch || "Unavailable"}</p>
        <p className="text-xs text-muted-foreground">
          {row.original.upstream ?? "No upstream"}
        </p>
      </div>
    ),
  },
  {
    id: "sync",
    header: "Sync",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.ahead ?? "?"} ahead / {row.original.behind ?? "?"} behind
      </span>
    ),
  },
  {
    id: "changes",
    header: "Changes",
    cell: ({ row }) => (
      <div>
        <strong>{row.original.changedFiles}</strong>
        <p className="text-xs text-muted-foreground">
          {row.original.revision ?? "No revision"}
        </p>
      </div>
    ),
  },
  {
    id: "commit",
    header: "Last Commit",
    cell: ({ row }) => (
      <div className="max-w-64">
        <p className="truncate">
          {row.original.lastCommitSubject ?? "Unavailable"}
        </p>
        <p className="text-xs text-muted-foreground">
          {row.original.lastCommitAt
            ? new Date(row.original.lastCommitAt).toLocaleString()
            : "No timestamp"}
        </p>
      </div>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => (
      <WorkspaceStatusBadge
        label={statusLabel(row.original)}
        tone={
          row.original.status === "healthy"
            ? "success"
            : row.original.status === "changed"
              ? "warning"
              : "danger"
        }
      />
    ),
  },
  {
    id: "github",
    header: "GitHub",
    cell: ({ row }) =>
      row.original.githubUrl ? (
        <a
          className="inline-flex items-center gap-1 text-sm font-medium text-primary"
          href={row.original.githubUrl}
          onClick={(event) => event.stopPropagation()}
          rel="noreferrer"
          target="_blank"
        >
          Open <ExternalLink className="size-3" />
        </a>
      ) : (
        <span className="text-xs text-muted-foreground">Not connected</span>
      ),
  },
];

export function GithubDashboardList({
  isLoading,
  onProjectOpen,
  projects,
}: {
  isLoading: boolean;
  onProjectOpen: (project: GithubProjectState) => void;
  projects: GithubProjectState[];
}) {
  return (
    <WorkspaceTable
      columns={columns}
      data={projects}
      emptyState="No Git projects were discovered in the configured workspace."
      isLoading={isLoading}
      minWidth="1100px"
      onRowClick={onProjectOpen}
    />
  );
}

function statusLabel(project: GithubProjectState) {
  if (project.status === "healthy") return "Synchronized";
  if (project.status === "changed") return "Changed";
  if (project.status === "attention") return "Needs attention";
  return "Unavailable";
}
