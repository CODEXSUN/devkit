import "@excalidraw/excalidraw/index.css";
import { Excalidraw, serializeAsJSON } from "@excalidraw/excalidraw";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { ArrowLeft, Clock3, FilePenLine } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CoworkerClient } from "./client";
import type { CoworkerPlanningBoard, CoworkerPlanningScene, CoworkerProject } from "./types";

type SaveState = "loading" | "draft" | "saving" | "saved" | "error";

export function ProjectWhiteBoard({ client, createRequest, project }: { client: CoworkerClient; createRequest: number; project: CoworkerProject }) {
  const [boards, setBoards] = useState<CoworkerPlanningBoard[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [state, setState] = useState<SaveState>("loading");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingScene = useRef<CoworkerPlanningScene | null>(null);
  const pendingBoardId = useRef("");
  const savedSceneSignature = useRef("");
  const handledCreateRequest = useRef(createRequest);
  const selected = boards.find((board) => board.uuid === selectedId);

  useEffect(() => {
    setState("loading");
    void client.planningBoards(project.id).then((result) => {
      setBoards(result);
      setSelectedId("");
      pendingScene.current = null;
      savedSceneSignature.current = "";
      setState("saved");
    }).catch(() => setState("error"));
    return flushDraft;
  }, [client, project.id]);

  const createBoard = useCallback(async () => {
    setState("saving");
    try {
      const board = await client.createPlanningBoard(project.id, `${project.title} whiteboard ${boards.length + 1}`);
      setBoards((current) => [board, ...current]);
      setSelectedId(board.uuid);
      pendingScene.current = null;
      pendingBoardId.current = board.uuid;
      savedSceneSignature.current = sceneSignature(board.scene);
      clearBoardDraft(board.uuid);
      setState("saved");
    } catch { setState("error"); }
  }, [boards.length, client, project.id, project.title]);

  useEffect(() => {
    if (createRequest === handledCreateRequest.current || state === "loading" || state === "saving") return;
    handledCreateRequest.current = createRequest;
    void createBoard();
  }, [createBoard, createRequest, state]);

  const saveScene = useCallback(async (board: CoworkerPlanningBoard, scene: CoworkerPlanningScene) => {
    setState("saving");
    try {
      const saved = await client.updatePlanningBoard(board.uuid, scene);
      savedSceneSignature.current = sceneSignature(saved.scene);
      setBoards((current) => current.map((entry) => entry.uuid === saved.uuid ? saved : entry));
      if (pendingScene.current === scene) {
        pendingScene.current = null;
        clearBoardDraft(board.uuid);
        setState("saved");
      } else {
        setState("draft");
      }
    } catch {
      saveBoardDraft(board.uuid, pendingScene.current ?? scene);
      setState(pendingScene.current && pendingScene.current !== scene ? "draft" : "error");
    }
  }, [client]);

  function queueDraft(board: CoworkerPlanningBoard, scene: CoworkerPlanningScene) {
    if (timer.current) clearTimeout(timer.current);
    if (sceneSignature(scene) === savedSceneSignature.current) {
      timer.current = null;
      pendingScene.current = null;
      clearBoardDraft(board.uuid);
      setState("saved");
      return;
    }
    pendingScene.current = scene;
    pendingBoardId.current = board.uuid;
    setState("draft");
    timer.current = setTimeout(() => {
      timer.current = null;
      saveBoardDraft(board.uuid, scene);
    }, 400);
  }

  const saveNow = useCallback(() => {
    if (!selected) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    void saveScene(selected, pendingScene.current ?? selected.scene);
  }, [saveScene, selected]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (selected && (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveNow();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [saveNow, selected]);

  function openBoard(uuid: string) {
    flushDraft();
    const recovery = readBoardDraft(uuid);
    const board = boards.find((entry) => entry.uuid === uuid);
    pendingBoardId.current = uuid;
    pendingScene.current = recovery;
    savedSceneSignature.current = board ? sceneSignature(board.scene) : "";
    setState(recovery ? "draft" : "saved");
    setSelectedId(uuid);
  }

  function closeBoard() {
    flushDraft();
    setSelectedId("");
    pendingScene.current = null;
    pendingBoardId.current = "";
  }

  function flushDraft() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (pendingBoardId.current && pendingScene.current) {
      saveBoardDraft(pendingBoardId.current, pendingScene.current);
    }
  }

  if (state === "loading") return <p className="project-tab-state">Loading whiteboards…</p>;
  if (!selected) return <WhiteBoardList boards={boards} onOpen={openBoard} />;
  return <section className="project-whiteboard">
    <header>
      <button aria-label="Back to whiteboard files" className="project-whiteboard-back" onClick={closeBoard} type="button"><ArrowLeft size={16} /></button>
      <strong>{selected.title}</strong>
      <button aria-label="Save whiteboard" className={`project-whiteboard-save ${state}`} disabled={state === "saving"} onClick={saveNow} title="Save whiteboard (Ctrl+S)" type="button">
        <i aria-hidden="true" />
        {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Draft"}
      </button>
    </header>
    <div className="project-whiteboard-canvas" key={selected.uuid}>
      <Excalidraw
        initialData={{ appState: (pendingScene.current ?? selected.scene).appState as Partial<AppState>, elements: (pendingScene.current ?? selected.scene).elements as readonly ExcalidrawElement[], files: (pendingScene.current ?? selected.scene).files as BinaryFiles }}
        onChange={(elements, appState, files) => queueDraft(selected, JSON.parse(serializeAsJSON(elements, appState, files, "database")) as CoworkerPlanningScene)}
      />
    </div>
  </section>;
}

function WhiteBoardList({ boards, onOpen }: { boards: CoworkerPlanningBoard[]; onOpen: (uuid: string) => void }) {
  return <section className="project-whiteboard-list">
    <header><div><strong>Whiteboard files</strong><span>{boards.length} {boards.length === 1 ? "board" : "boards"}</span></div></header>
    {boards.length ? <div>{boards.map((board, index) => <button key={board.uuid} onClick={() => onOpen(board.uuid)} type="button"><span className="project-whiteboard-file-icon"><FilePenLine size={17} /></span><b>{String(index + 1).padStart(3, "0")}</b><span><strong>{board.title}</strong><small>{board.description || "Excalidraw planning board"}</small></span><em>{board.scene.elements.length} elements</em><time><Clock3 size={12} /> {formatUpdated(board.updatedAt)}</time></button>)}</div> : <div className="project-whiteboard-empty"><strong>No project whiteboards</strong><p>Use Add board above to create a planning canvas.</p></div>}
  </section>;
}

function formatUpdated(value: string) {
  const elapsed = Date.now() - Date.parse(value);
  if (elapsed < 60_000) return "Just now";
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h ago`;
  return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" }).format(new Date(value));
}

function boardDraftKey(uuid: string) {
  return `devkit:whiteboard-recovery:${uuid}`;
}

function sceneSignature(scene: CoworkerPlanningScene) {
  return JSON.stringify(scene);
}

function readBoardDraft(uuid: string) {
  try {
    return JSON.parse(localStorage.getItem(boardDraftKey(uuid)) ?? "null") as CoworkerPlanningScene | null;
  } catch {
    return null;
  }
}

function saveBoardDraft(uuid: string, scene: CoworkerPlanningScene) {
  try {
    localStorage.setItem(boardDraftKey(uuid), JSON.stringify(scene));
  } catch {
    // Local recovery is optional.
  }
}

function clearBoardDraft(uuid: string) {
  try {
    localStorage.removeItem(boardDraftKey(uuid));
  } catch {
    // Local recovery is optional.
  }
}
