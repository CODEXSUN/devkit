import { useCallback, useEffect, useRef, useState } from "react";
import type { FileEntry, GitChange, SystemStatus, Workspace } from "../contracts/desktop";
import { desktopClient } from "../services/desktop-client";
import { afterFirstPaint } from "./startup-scheduler";

export type ResourceState = "idle" | "loading" | "ready" | "unavailable";
export type AgentRuntimeState = "idle" | "connecting" | "ready" | "unavailable";

export function useDesktopSession() {
  const [agentRuntimeState] = useState<AgentRuntimeState>("idle");
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

  const loadFiles = useCallback(async () => {
    const generation = requestGeneration.current;
    setFilesState("loading");
    try {
      const nextFiles = await desktopClient.listFiles();
      if (requestGeneration.current !== generation) return;
      setFiles(nextFiles);
      setFilesState("ready");
    } catch {
      if (requestGeneration.current !== generation) return;
      setFilesState("unavailable");
    }
  }, []);

  const loadSystem = useCallback(async () => {
    try {
      setSystem(await desktopClient.systemStatus());
    } catch {
      setSystem(undefined);
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
        setFilesState("idle");
        setChanges([]);
        setChangesState("idle");
        setSystem(undefined);
        localStorage.setItem("codelogix-workspace", next.path);
      } catch (reason) {
        if (path) localStorage.removeItem("codelogix-workspace");
        setError(reason instanceof Error ? reason.message : String(reason));
      } finally {
        if (requestGeneration.current === generation) setOpening(false);
      }
    },
    []
  );

  useEffect(() => {
    const recentWorkspace = localStorage.getItem("codelogix-workspace");
    if (!recentWorkspace) return;
    return afterFirstPaint(() => void openWorkspace(recentWorkspace));
  }, [openWorkspace]);

  return {
    agentRuntimeState,
    changes,
    changesState,
    error,
    files,
    filesState,
    loadFiles,
    loadSystem,
    openWorkspace,
    opening,
    refreshChanges,
    system,
    workspace
  };
}
