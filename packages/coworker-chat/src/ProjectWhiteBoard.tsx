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
  const handledCreateRequest = useRef(createRequest);
  const selected = boards.find((board) => board.uuid === selectedId);

  useEffect(() => {
    setState("loading");
    void client.planningBoards(project.id).then((result) => {
      setBoards(result);
      setSelectedId("");
      pendingScene.current = null;
      setState("saved");
    }).catch(() => setState("error"));
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [client, project.id]);

  const createBoard = useCallback(async () => {
    setState("saving");
    try {
      const board = await client.createPlanningBoard(project.id, `${project.title} whiteboard ${boards.length + 1}`);
      setBoards((current) => [board, ...current]);
      setSelectedId(board.uuid);
      pendingScene.current = null;
      setState("saved");
    } catch { setState("error"); }
  }, [boards.length, client, project.id, project.title]);

  useEffect(() => {
    if (createRequest === handledCreateRequest.current || state === "loading" || state === "saving") return;
    handledCreateRequest.current = createRequest;
    void createBoard();
  }, [createBoard, createRequest, state]);

  async function saveScene(board: CoworkerPlanningBoard, scene: CoworkerPlanningScene) {
    setState("saving");
    try {
      const saved = await client.updatePlanningBoard(board.uuid, scene);
      setBoards((current) => current.map((entry) => entry.uuid === saved.uuid ? saved : entry));
      if (pendingScene.current === scene) {
        pendingScene.current = null;
        setState("saved");
      } else {
        setState("draft");
      }
    } catch {
      setState(pendingScene.current && pendingScene.current !== scene ? "draft" : "error");
    }
  }

  function queueSave(board: CoworkerPlanningBoard, scene: CoworkerPlanningScene) {
    if (timer.current) clearTimeout(timer.current);
    pendingScene.current = scene;
    setState("draft");
    timer.current = setTimeout(() => {
      timer.current = null;
      void saveScene(board, scene);
    }, 900);
  }

  function saveNow() {
    if (!selected) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    void saveScene(selected, pendingScene.current ?? selected.scene);
  }

  if (state === "loading") return <p className="project-tab-state">Loading whiteboards…</p>;
  if (!selected) return <WhiteBoardList boards={boards} onOpen={setSelectedId} />;
  return <section className="project-whiteboard">
    <header>
      <button aria-label="Back to whiteboard files" className="project-whiteboard-back" onClick={() => setSelectedId("")} type="button"><ArrowLeft size={16} /></button>
      <strong>{selected.title}</strong>
      <button className={`project-whiteboard-save ${state}`} disabled={state === "saving"} onClick={saveNow} type="button">
        <i aria-hidden="true" />
        {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : state === "error" ? "Retry save" : "Draft"}
      </button>
    </header>
    <div className="project-whiteboard-canvas" key={selected.uuid}>
      <Excalidraw
        initialData={{ appState: selected.scene.appState as Partial<AppState>, elements: selected.scene.elements as readonly ExcalidrawElement[], files: selected.scene.files as BinaryFiles }}
        onChange={(elements, appState, files) => queueSave(selected, JSON.parse(serializeAsJSON(elements, appState, files, "database")) as CoworkerPlanningScene)}
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
