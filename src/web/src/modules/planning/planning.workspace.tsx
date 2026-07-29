import "@excalidraw/excalidraw/index.css";
import { Excalidraw, serializeAsJSON } from "@excalidraw/excalidraw";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { Button } from "@codexsun/ui/components/button";
import { Input } from "@codexsun/ui/components/input";
import { GlobalLoader } from "@codexsun/ui/components/global-loader";
import { PlusIcon, SaveIcon, Trash2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useProjectManagerRecordsQuery } from "../project-manager/project-manager.hooks";
import {
  usePlanningActions,
  usePlanningBoard,
  usePlanningBoards,
} from "./planning.hooks";
import type { PlanningScene } from "./planning.types";

export function PlanningWorkspace() {
  const uuid = window.location.pathname.split("/").filter(Boolean)[3] ?? "";
  return uuid ? <PlanningEditor uuid={uuid} /> : <PlanningBoardList />;
}

function PlanningBoardList() {
  const boards = usePlanningBoards();
  const projects = useProjectManagerRecordsQuery("project");
  const actions = usePlanningActions();
  const [title, setTitle] = useState("");
  const [projectUuid, setProjectUuid] = useState("");
  const create = async () => {
    const board = await actions.create.mutateAsync({
      description: "",
      projectUuid: projectUuid || null,
      title: title.trim(),
    });
    window.location.assign(`/app/devkit/planning/${board.uuid}`);
  };
  return (
    <main className="mx-auto w-[calc(100%-2rem)] max-w-[92rem] space-y-4 py-5">
      <header className="flex flex-wrap items-end justify-between gap-3 rounded-md border bg-card p-5 shadow-sm">
        <div>
          <p className="text-sm font-semibold uppercase text-muted-foreground">
            Planning
          </p>
          <h1 className="text-2xl font-semibold">Whiteboards</h1>
          <p className="text-sm text-muted-foreground">
            Visual plans connected to DevKit projects and synchronized with
            cloud.
          </p>
        </div>
      </header>
      <section className="grid gap-3 rounded-md border bg-card p-4 md:grid-cols-[1fr_18rem_auto]">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Board title"
        />
        <select
          className="h-9 rounded-md border bg-background px-3 text-sm"
          value={projectUuid}
          onChange={(event) => setProjectUuid(event.target.value)}
        >
          <option value="">No project</option>
          {(projects.data ?? []).map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </select>
        <Button
          disabled={!title.trim() || actions.create.isPending}
          onClick={() => void create()}
        >
          <PlusIcon /> Create board
        </Button>
      </section>
      {boards.isLoading ? (
        <GlobalLoader />
      ) : (
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(boards.data ?? []).map((board) => (
            <button
              key={board.uuid}
              className="rounded-md border bg-card p-4 text-left shadow-sm hover:border-primary"
              onClick={() =>
                window.location.assign(`/app/devkit/planning/${board.uuid}`)
              }
            >
              <h2 className="font-semibold">{board.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {board.description || "Visual planning board"}
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                Updated {new Date(board.updatedAt).toLocaleString()}
              </p>
            </button>
          ))}
        </section>
      )}
    </main>
  );
}

function PlanningEditor({ uuid }: { uuid: string }) {
  const board = usePlanningBoard(uuid);
  const actions = usePlanningActions();
  const pending = useRef<PlanningScene | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const save = async (notify = false) => {
    if (!pending.current) return;
    await actions.update.mutateAsync({
      uuid,
      input: { scene: pending.current },
    });
    pending.current = null;
    if (notify)
      toast.success("Planning board saved", { description: board.data?.title });
  };
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  if (board.isLoading || !board.data) return <GlobalLoader />;
  const remove = async () => {
    await actions.delete.mutateAsync(uuid);
    window.location.assign("/app/devkit/planning");
  };
  return (
    <main className="flex h-[calc(100vh-3.5rem)] flex-col p-4">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card px-4 py-3">
        <div>
          <button
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => window.location.assign("/app/devkit/planning")}
          >
            ← Whiteboards
          </button>
          <h1 className="text-lg font-semibold">{board.data.title}</h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => void save(true)}
            disabled={actions.update.isPending}
          >
            <SaveIcon /> Save
          </Button>
          <Button variant="outline" onClick={() => void remove()}>
            <Trash2Icon /> Delete
          </Button>
        </div>
      </header>
      <section className="min-h-0 flex-1 overflow-hidden rounded-md border bg-white">
        <Excalidraw
          initialData={{
            elements: board.data.scene.elements as readonly ExcalidrawElement[],
            appState: board.data.scene.appState as Partial<AppState>,
            files: board.data.scene.files as BinaryFiles,
          }}
          onChange={(elements, appState, files) => {
            const serialized = serializeAsJSON(
              elements,
              appState,
              files,
              "database",
            );
            pending.current = JSON.parse(serialized) as PlanningScene;
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => void save(), 1200);
          }}
        />
      </section>
    </main>
  );
}
