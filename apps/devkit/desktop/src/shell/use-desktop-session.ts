import { useCallback, useEffect, useRef, useState } from "react";
import type { FileEntry, GitChange, SystemStatus, Workspace } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";

export type ResourceState = "idle" | "loading" | "ready" | "unavailable";
export type AgentRuntimeState = "connecting" | "ready" | "unavailable";

export function useDesktopSession() {
  const [agentRuntimeState, setAgentRuntimeState] = useState<AgentRuntimeState>("connecting");
  const [changes, setChanges] = useState<GitChange[]>([]);
  const [changesState, setChangesState] = useState<ResourceState>("idle");
  const [error, setError] = useState<string>();
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [filesState, setFilesState] = useState<ResourceState>("idle");
  const [opening, setOpening] = useState(false);
  const [system, setSystem] = useState<SystemStatus>();
  const [workspace, setWorkspace] = useState<Workspace>();
  const requestGeneration = useRef(0);

  const refreshChanges = useCallback(async () => {
    setChangesState("loading");
    try {
      setChanges(await desktopClient.gitStatus());
      setChangesState("ready");
    } catch (reason) {
      setChangesState("unavailable");
      throw reason;
    }
  }, []);

  const loadWorkspaceResources = useCallback(async (generation: number) => {
    setFilesState("loading");
    setChangesState("loading");
    const [nextFiles, nextChanges] = await Promise.allSettled([
      desktopClient.listFiles(),
      desktopClient.gitStatus()
    ]);
    if (requestGeneration.current !== generation) return;

    if (nextFiles.status === "fulfilled") {
      setFiles(nextFiles.value);
      setFilesState("ready");
    } else {
      setFilesState("unavailable");
    }
    if (nextChanges.status === "fulfilled") {
      setChanges(nextChanges.value);
      setChangesState("ready");
    } else {
      setChangesState("unavailable");
    }
  }, []);

  const openWorkspace = useCallback(
    async (path?: string) => {
      const generation = requestGeneration.current + 1;
      requestGeneration.current = generation;
      setOpening(true);
      setError(undefined);
      try {
        const next = await desktopClient.openWorkspace(path);
        if (requestGeneration.current !== generation) return;
        setWorkspace(next);
        setFiles([]);
        setChanges([]);
        localStorage.setItem("codelogix-workspace", next.path);
        void loadWorkspaceResources(generation);
      } catch (reason) {
        if (path) localStorage.removeItem("codelogix-workspace");
        setError(reason instanceof Error ? reason.message : String(reason));
      } finally {
        if (requestGeneration.current === generation) setOpening(false);
      }
    },
    [loadWorkspaceResources]
  );

  useEffect(() => {
    void desktopClient
      .startAgentRuntime()
      .then(() => setAgentRuntimeState("ready"))
      .catch(() => setAgentRuntimeState("unavailable"));
    void desktopClient
      .systemStatus()
      .then(setSystem)
      .catch(() => undefined);
    const recentWorkspace = localStorage.getItem("codelogix-workspace");
    if (recentWorkspace) void openWorkspace(recentWorkspace);
  }, [openWorkspace]);

  return {
    agentRuntimeState,
    changes,
    changesState,
    error,
    files,
    filesState,
    openWorkspace,
    opening,
    refreshChanges,
    system,
    workspace
  };
}
