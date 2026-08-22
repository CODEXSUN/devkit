import { Blocks, FolderGit2, FolderOpen, Puzzle, type LucideIcon } from "lucide-react";
import type { DesktopWorkspace, Workspace } from "../contracts/desktop";

export function ProjectOverview({
  currentWorkspace,
  onOpenProject,
  workspaces
}: {
  currentWorkspace: Workspace;
  onOpenProject: (path: string) => void;
  workspaces: DesktopWorkspace[];
}) {
  const projects = workspaces.filter((workspace) => workspace.relationship === "project");
  const addOns = workspaces.filter((workspace) => workspace.relationship === "addOn");
  const plugins = workspaces.filter((workspace) => workspace.kind === "plugin" && workspace.relationship !== "addOn");
  const displayedWorkspaceCount = projects.length + addOns.length + plugins.length;

  return <section className="project-overview">
    <header className="project-overview-header">
      <div><p>Local workspaces</p><h1>Projects</h1><span>Select a project to review its local repository details.</span></div>
      <strong>{displayedWorkspaceCount} connected</strong>
    </header>
    <ProjectSection currentWorkspace={currentWorkspace} icon={FolderGit2} label="Projects" onOpenProject={onOpenProject} workspaces={projects} />
    <ProjectSection currentWorkspace={currentWorkspace} icon={Blocks} label="Add-on projects" onOpenProject={onOpenProject} workspaces={addOns} />
    <ProjectSection currentWorkspace={currentWorkspace} icon={Puzzle} label="Plugins" onOpenProject={onOpenProject} workspaces={plugins} />
  </section>;
}

function ProjectSection({
  currentWorkspace,
  icon: Icon,
  label,
  onOpenProject,
  workspaces
}: {
  currentWorkspace: Workspace;
  icon: LucideIcon;
  label: string;
  onOpenProject: (path: string) => void;
  workspaces: DesktopWorkspace[];
}) {
  if (workspaces.length === 0) return null;
  return <section className="project-overview-section">
    <h2><Icon size={16} /> {label}</h2>
    <div className="project-card-grid">
      {workspaces.map((workspace) => {
        const active = workspace.path === currentWorkspace.path;
        return <article className={`project-card${active ? " active" : ""}`} key={workspace.path}>
          <header><FolderGit2 size={18} /><div><h3>{workspace.name}</h3><span>{active ? "Open now" : workspace.kind === "plugin" ? "Plugin" : "Application"}</span></div></header>
          <p title={workspace.path}>{workspace.path}</p>
          <footer><span>{workspace.pinned ? "Pinned" : "Connected"}</span><button onClick={() => onOpenProject(workspace.path)} type="button"><FolderOpen size={14} /> View overview</button></footer>
        </article>;
      })}
    </div>
  </section>;
}
