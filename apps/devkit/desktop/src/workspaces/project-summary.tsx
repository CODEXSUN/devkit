import { Bot, FolderOpen, GitBranch, Info, Link2, type LucideIcon } from "lucide-react";
import type { DesktopWorkspace, Workspace } from "../contracts/desktop";
import { ProjectTaskControl } from "./project-task-control";

export function ProjectSummary({
  onBrowseFiles,
  onOpenAgent,
  workspace,
  workspaces
}: {
  onBrowseFiles: () => void;
  onOpenAgent: () => void;
  workspace: Workspace;
  workspaces: DesktopWorkspace[];
}) {
  const project = workspaces.find((item) => item.path === workspace.path);
  const relationship = relationshipLabel(project?.relationship);
  const kind = project?.kind === "plugin" ? "Plugin" : "Application";

  return (
    <section className="project-summary">
        <header className="project-summary-header">
          <div>
            <p>Current project</p>
            <h1>{workspace.name}</h1>
            <span>
              {relationship} · {kind}
            </span>
          </div>
          <span className="project-summary-status">Connected locally</span>
        </header>
        <section className="project-summary-about">
          <Info size={18} />
          <div>
            <h2>About this project</h2>
            <p>
              This is the active local repository. DevKit keeps its workspace connection and opens
              the coding agent, files, and Git tools in this project context.
            </p>
          </div>
        </section>
        <div className="project-summary-grid">
          <SummaryCard
            icon={GitBranch}
            label="Repository branch"
            value={workspace.branch || "No branch detected"}
          />
          <SummaryCard
            icon={Link2}
            label="Connection"
            value={project?.pinned ? "Pinned local workspace" : "Connected local workspace"}
          />
          <SummaryCard icon={FolderOpen} label="Repository location" value={workspace.path} />
        </div>
        <footer className="project-summary-actions">
          <button className="project-summary-primary" onClick={onOpenAgent} type="button">
            <Bot size={15} /> Open agent
          </button>
          <button onClick={onBrowseFiles} type="button">
            <FolderOpen size={15} /> Browse files
          </button>
        </footer>
        <ProjectTaskControl workspacePath={workspace.path} />
    </section>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <article className="project-summary-card">
      <Icon size={17} />
      <span>{label}</span>
      <strong title={value}>{value}</strong>
    </article>
  );
}

function relationshipLabel(relationship: DesktopWorkspace["relationship"] | undefined) {
  if (relationship === "addOn") return "Add-on project";
  if (relationship === "project") return "Project";
  return "Standalone workspace";
}
