import { useEffect, useMemo, useState } from "react";
import {
  Blocks,
  Bot,
  Box,
  Bug,
  ChevronRight,
  CircleDot,
  Files,
  GitBranch,
  ListTodo,
  PanelBottom,
  Play,
  Search,
  Settings,
  SlidersHorizontal,
  TerminalSquare
} from "lucide-react";
import type { FileEntry, GitChange, SystemStatus, Workspace } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";
import { EditorWorkspace } from "../workspaces/editor-workspace";
import { SetupWorkspace } from "../workspaces/setup-workspace";
import { TweakPanel } from "./tweak-panel";

type Activity = "assist" | "docker" | "files" | "git" | "tasks";
type Density = "compact" | "relaxed";

const activities = [
  { icon: Files, id: "files", label: "Explorer" },
  { icon: Search, id: "search", label: "Search" },
  { icon: GitBranch, id: "git", label: "Source control" },
  { icon: ListTodo, id: "tasks", label: "Tasks" },
  { icon: Bot, id: "assist", label: "Assist" },
  { icon: Box, id: "docker", label: "Docker" }
] as const;

export function DesktopApp() {
  const [activity, setActivity] = useState<Activity>("files");
  const [density, setDensity] = useState<Density>("compact");
  const [workspace, setWorkspace] = useState<Workspace>();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [changes, setChanges] = useState<GitChange[]>([]);
  const [system, setSystem] = useState<SystemStatus>();
  const [selectedPath, setSelectedPath] = useState<string>();
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    void desktopClient
      .systemStatus()
      .then(setSystem)
      .catch(() => undefined);
  }, []);

  async function openWorkspace(path?: string) {
    try {
      const next = await desktopClient.openWorkspace(path);
      const [nextFiles, nextChanges] = await Promise.all([
        desktopClient.listFiles(),
        desktopClient.gitStatus()
      ]);
      setWorkspace(next);
      setFiles(nextFiles);
      setChanges(nextChanges);
      setSelectedPath(nextFiles.find((entry) => entry.kind === "file")?.path);
      setError(undefined);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    }
  }

  const panelTitle = useMemo(
    () => activities.find((item) => item.id === activity)?.label ?? "Explorer",
    [activity]
  );

  if (!workspace) return <SetupWorkspace error={error} onOpen={openWorkspace} system={system} />;

  return (
    <div className="ide" data-density={density}>
      <header className="titlebar">
        <div className="window-mark">
          <Blocks size={17} /> CodeLogicX
        </div>
        <div className="command-center">
          <Search size={14} /> {workspace.name}
        </div>
        <div className="title-actions">
          <Play size={15} />
          <Bug size={15} />
          <Settings size={15} />
        </div>
      </header>
      <div className="ide-body">
        <nav className="activity-bar" aria-label="IDE activities">
          <div>
            {activities.map((item) => (
              <button
                aria-label={item.label}
                className={activity === item.id ? "active" : ""}
                key={item.id}
                onClick={() => setActivity(item.id as Activity)}
                title={item.label}
                type="button"
              >
                <item.icon size={21} />
              </button>
            ))}
          </div>
          <button aria-label="Settings" type="button">
            <Settings size={21} />
          </button>
        </nav>
        <aside className="side-panel">
          <div className="panel-heading">{panelTitle}</div>
          <SidePanel
            activity={activity}
            changes={changes}
            files={files}
            onSelectFile={setSelectedPath}
            selectedPath={selectedPath}
            workspace={workspace}
          />
        </aside>
        <main className="workbench">
          <EditorWorkspace path={selectedPath} />
          {terminalOpen ? <TerminalPanel workspace={workspace} /> : null}
        </main>
      </div>
      <footer className="statusbar">
        <span>
          <GitBranch size={13} /> {workspace.branch}
        </span>
        <span>
          <CircleDot size={13} /> {changes.length} changes
        </span>
        <span className="status-spacer" />
        <span>{system?.platform ?? "desktop"}</span>
        <button onClick={() => setTerminalOpen((value) => !value)} type="button">
          <PanelBottom size={13} /> Terminal
        </button>
      </footer>
      <TweakPanel density={density} onDensityChange={setDensity} />
    </div>
  );
}

function SidePanel({
  activity,
  changes,
  files,
  onSelectFile,
  selectedPath,
  workspace
}: {
  activity: Activity;
  changes: GitChange[];
  files: FileEntry[];
  onSelectFile: (path: string) => void;
  selectedPath: string | undefined;
  workspace: Workspace;
}) {
  if (activity === "git") {
    return (
      <div className="tree">
        <div className="tree-section">Changes {changes.length}</div>
        {changes.map((change) => (
          <div className="tree-row" key={change.path}>
            <span>{change.path}</span>
            <b>{change.status}</b>
          </div>
        ))}
      </div>
    );
  }
  if (activity !== "files") return <EmptyPanel activity={activity} />;
  return (
    <div className="tree">
      <div className="tree-section">
        <ChevronRight size={14} /> {workspace.name}
      </div>
      {files.map((file) => (
        <button
          className={selectedPath === file.path ? "tree-row selected" : "tree-row"}
          disabled={file.kind === "directory"}
          key={file.path}
          onClick={() => onSelectFile(file.path)}
          type="button"
        >
          <span>{file.name}</span>
        </button>
      ))}
    </div>
  );
}

function EmptyPanel({ activity }: { activity: Activity }) {
  const descriptions: Record<Activity, string> = {
    assist: "Connect Assist to plan, edit, review, and verify this workspace.",
    docker: "Inspect services and run approved Docker operations.",
    files: "Open a workspace to browse files.",
    git: "Open a Git repository to review changes.",
    tasks: "Local tasks remain available offline and sync to DevKit."
  };
  return (
    <div className="empty-panel">
      <SlidersHorizontal size={20} />
      <p>{descriptions[activity]}</p>
    </div>
  );
}

function TerminalPanel({ workspace }: { workspace: Workspace }) {
  return (
    <section className="terminal">
      <div className="terminal-tabs">
        <span>
          <TerminalSquare size={14} /> PowerShell
        </span>
        <span className="terminal-path">{workspace.path}</span>
      </div>
      <pre>CodeLogicX desktop runtime ready.{"\n"}Open a command from the command palette.</pre>
    </section>
  );
}
