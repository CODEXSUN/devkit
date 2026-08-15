import { lazy, Suspense, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  Blocks,
  Bot,
  BrainCircuit,
  Box,
  CircleDot,
  Files,
  GitBranch,
  ListTodo,
  Menu,
  PanelBottom,
  Search,
  Settings
} from "lucide-react";
import { AgentWorkspace } from "../workspaces/agent-workspace";
import { MAX_AGENT_CONTEXT_FILES } from "../workspaces/agent-context";
import { SetupWorkspace } from "../workspaces/setup-workspace";
import { AppDrawer } from "./app-drawer";
import { OpenInMenu } from "./open-in-menu";
import { CommandPalette, type PaletteCommand } from "./command-palette";
import {
  UpdateButton,
  UpdateCenter,
  VersionUpdateButton
} from "../updates/update-center";
import { useDesktopUpdater } from "../updates/use-desktop-updater";
import { DesktopSidePanel } from "./desktop-side-panel";
import { useDesktopSession } from "./use-desktop-session";
import { useDesktopUiStore } from "./use-desktop-ui-store";

type Theme = "dark" | "light" | "system";

const EditorWorkspace = lazy(() =>
  import("../workspaces/editor-workspace").then((module) => ({ default: module.EditorWorkspace }))
);
const TerminalPanel = lazy(() =>
  import("../workspaces/terminal-panel").then((module) => ({ default: module.TerminalPanel }))
);

const activities = [
  { icon: Bot, id: "assist", label: "Agent" },
  { icon: Files, id: "files", label: "Explorer" },
  { icon: Search, id: "search", label: "Search" },
  { icon: GitBranch, id: "git", label: "Source control" },
  { icon: ListTodo, id: "tasks", label: "Tasks" },
  { icon: BrainCircuit, id: "learning", label: "Project learning" },
  { icon: Box, id: "docker", label: "Docker" }
] as const;

export function DesktopApp() {
  const ui = useDesktopUiStore();
  const { togglePalette, toggleTerminal } = ui;
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem("devkit-theme");
    return saved === "dark" || saved === "light" ? saved : "system";
  });
  const [systemDark, setSystemDark] = useState(
    () => matchMedia("(prefers-color-scheme: dark)").matches
  );
  const [selectedPath, setSelectedPath] = useState<string>();
  const [agentContextPaths, setAgentContextPaths] = useState<string[]>([]);
  const [editorStarted, setEditorStarted] = useState(false);
  const updater = useDesktopUpdater();
  const session = useDesktopSession();
  const { changes, files, system, workspace } = session;

  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => setSystemDark(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const resolvedTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
    localStorage.setItem("devkit-theme", theme);
  }, [resolvedTheme, theme]);

  useEffect(() => {
    setAgentContextPaths([]);
    setSelectedPath(undefined);
  }, [workspace?.path]);

  useLayoutEffect(() => {
    if (ui.activity !== "assist") setEditorStarted(true);
  }, [ui.activity]);

  useEffect(() => {
    function keyboard(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        togglePalette();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "`") {
        event.preventDefault();
        toggleTerminal();
      }
    }
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, [togglePalette, toggleTerminal]);

  const panelTitle = useMemo(
    () => activities.find((item) => item.id === ui.activity)?.label ?? "Explorer",
    [ui.activity]
  );

  const paletteCommands = useMemo<PaletteCommand[]>(
    () => [
      {
        id: "open-workspace",
        label: "Open workspace",
        detail: "Choose a local repository",
        run: () => void session.openWorkspace()
      },
      ...activities.map((item) => ({
        id: `activity-${item.id}`,
        label: `Show ${item.label}`,
        detail: "Workspace view",
        run: () => ui.setActivity(item.id)
      })),
      {
        id: "toggle-terminal",
        label: ui.terminalOpen ? "Hide terminal" : "Show terminal",
        detail: "Ctrl + `",
        run: ui.toggleTerminal
      },
      {
        id: "desktop-updates",
        label: "Check for updates",
        detail: "Download signed releases",
        run: () => ui.setUpdateOpen(true)
      },
      ...(["system", "light", "dark"] as const).map((option) => ({
        id: `theme-${option}`,
        label: `Use ${option} theme`,
        detail: "Appearance",
        run: () => setTheme(option)
      })),
      ...files
        .filter((file) => file.kind === "file")
        .map((file) => ({
          id: `file-${file.path}`,
          label: file.name,
          detail: file.path,
          run: () => {
            setSelectedPath(file.path);
            ui.setActivity("files");
          }
        }))
    ],
    [files, ui.setActivity, ui.setUpdateOpen, ui.terminalOpen, ui.toggleTerminal]
  );

  if (!workspace)
    return (
      <>
        <SetupWorkspace
          agentRuntimeState={session.agentRuntimeState}
          error={session.error}
          onOpen={session.openWorkspace}
          opening={session.opening}
          system={system}
        />
        <div className="setup-update">
          <UpdateButton onOpen={() => ui.setUpdateOpen(true)} update={updater} />
        </div>
        {ui.paletteOpen ? (
          <CommandPalette commands={paletteCommands} onClose={() => ui.setPaletteOpen(false)} />
        ) : null}
        {ui.updateOpen ? (
          <UpdateCenter onClose={() => ui.setUpdateOpen(false)} update={updater} />
        ) : null}
      </>
    );

  return (
    <div className="ide">
      <header className="titlebar">
        <div className="window-mark">
          <button
            aria-label="Open application menu"
            className="menu-trigger"
            onClick={() => ui.setDrawerOpen(true)}
            type="button"
          >
            <Menu size={18} />
          </button>
          <Blocks size={17} /> CodeLogix
        </div>
        <button className="command-center" onClick={() => ui.setPaletteOpen(true)} type="button">
          <Search size={14} /> Search commands and files <kbd>Ctrl K</kbd>
        </button>
        <div className="title-actions">
          <span className="environment-pill">Local / {workspace.branch}</span>
          <OpenInMenu path={selectedPath} />
          <UpdateButton onOpen={() => ui.setUpdateOpen(true)} update={updater} />
        </div>
      </header>
      <div className={ui.activity === "assist" ? "ide-body agent-active" : "ide-body"}>
        <nav className="activity-bar" aria-label="IDE activities">
          <div>
            {activities.map((item) => (
              <button
                aria-label={item.label}
                className={ui.activity === item.id ? "active" : ""}
                key={item.id}
                onClick={() => ui.setActivity(item.id)}
                title={item.label}
                type="button"
              >
                <item.icon size={21} />
              </button>
            ))}
          </div>
          <button
            aria-label="Open settings"
            onClick={() => ui.setDrawerOpen(true)}
            type="button"
          >
            <Settings size={21} />
          </button>
        </nav>
        {ui.activity !== "assist" ? (
          <aside className="side-panel">
            <div className="panel-heading">{panelTitle}</div>
            <DesktopSidePanel
              activity={ui.activity}
              changes={changes}
              changesState={session.changesState}
              files={files}
              filesState={session.filesState}
              onSelectFile={setSelectedPath}
              selectedPath={selectedPath}
              workspace={workspace}
              system={system}
              onRefreshChanges={session.refreshChanges}
            />
          </aside>
        ) : null}
        <main
          className={`workbench${ui.activity === "assist" ? " agent-workbench" : ""}${ui.terminalOpen ? " terminal-visible" : ""}`}
        >
          <div className="workspace-surface" hidden={ui.activity !== "assist"}>
            <AgentWorkspace
              changes={changes}
              changesState={session.changesState}
              contextPaths={agentContextPaths}
              files={files}
              filesState={session.filesState}
              key={workspace.path}
              onAddContext={(path) =>
                setAgentContextPaths((current) =>
                  current.includes(path) || current.length >= MAX_AGENT_CONTEXT_FILES
                    ? current
                    : [...current, path]
                )
              }
              onClearContext={() => setAgentContextPaths([])}
              onOpenFile={(path) => {
                setSelectedPath(path);
                ui.setActivity("files");
              }}
              onRefreshChanges={session.refreshChanges}
              onRemoveContext={(path) =>
                setAgentContextPaths((current) => current.filter((entry) => entry !== path))
              }
              selectedPath={selectedPath}
              workspace={workspace}
            />
          </div>
          {editorStarted ? (
            <div className="workspace-surface" hidden={ui.activity === "assist"}>
              <Suspense fallback={<div className="workspace-loading">Loading editor...</div>}>
                <EditorWorkspace
                  key={workspace.path}
                  onSelectPath={setSelectedPath}
                  path={selectedPath}
                  theme={resolvedTheme}
                />
              </Suspense>
            </div>
          ) : null}
          {ui.terminalOpen ? (
            <Suspense fallback={<div className="terminal-loading">Starting terminal...</div>}>
              <TerminalPanel theme={resolvedTheme} workspace={workspace} />
            </Suspense>
          ) : null}
        </main>
      </div>
      <footer className="statusbar">
        <VersionUpdateButton onOpen={() => ui.setUpdateOpen(true)} update={updater} />
        <span>
          <GitBranch size={13} /> {workspace.branch}
        </span>
        <span>
          <CircleDot size={13} />
          {session.changesState === "loading" ? "Refreshing Git" : `${changes.length} changes`}
        </span>
        <span className="status-spacer" />
        <span>{system?.platform ?? "desktop"}</span>
        <button onClick={ui.toggleTerminal} type="button">
          <PanelBottom size={13} /> Terminal
        </button>
      </footer>
      <AppDrawer
        onClose={() => ui.setDrawerOpen(false)}
        onOpenCommands={() => ui.setPaletteOpen(true)}
        onOpenUpdates={() => ui.setUpdateOpen(true)}
        onOpenWorkspace={() => void session.openWorkspace()}
        onThemeChange={setTheme}
        onToggleTerminal={ui.toggleTerminal}
        open={ui.drawerOpen}
        terminalOpen={ui.terminalOpen}
        theme={theme}
      />
      {ui.paletteOpen ? (
        <CommandPalette commands={paletteCommands} onClose={() => ui.setPaletteOpen(false)} />
      ) : null}
      {ui.updateOpen ? (
        <UpdateCenter onClose={() => ui.setUpdateOpen(false)} update={updater} />
      ) : null}
    </div>
  );
}
