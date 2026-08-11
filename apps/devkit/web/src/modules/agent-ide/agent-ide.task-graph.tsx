import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2Icon, CircleDotDashedIcon, GitForkIcon, PlayIcon, RotateCcwIcon } from "lucide-react";
import { toast } from "sonner";
import {
  finishAgentTask,
  getAgentTaskGraph,
  reviewAgentTaskGraph,
  saveAgentTaskGraph,
  startAgentTask
} from "./agent-ide.services";
import type { AgentRunDetail, AgentTaskGraph } from "./agent-ide.types";

export function AgentIdeTaskGraph({ run }: { run: AgentRunDetail }) {
  const queryClient = useQueryClient();
  const queryKey = ["devkit", "agent-task-graph", run.uuid];
  const query = useQuery({ queryFn: () => getAgentTaskGraph(run.uuid), queryKey, refetchInterval: 2_000 });
  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey });
    await queryClient.invalidateQueries({ queryKey: ["devkit", "agent-run", run.uuid] });
  };
  const mutate = useMutation({
    mutationFn: (action: () => Promise<AgentTaskGraph>) => action(),
    onError: (error) => toast.error(error instanceof Error ? error.message : "The task graph action failed."),
    onSuccess: refresh
  });
  const graph = query.data;
  if (!graph) return null;
  if (!graph.tasks.length) {
    return (
      <section className="rounded-lg border border-dashed p-3">
        <Title />
        <p className="pt-2 text-xs leading-5 text-muted-foreground">Split this parent run into scoped tasks before parallel execution.</p>
        <button className="mt-3 w-full rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground" onClick={() => mutate.mutate(() => saveAgentTaskGraph(run.uuid, starterTasks(run)))} type="button">
          Create starter decomposition
        </button>
      </section>
    );
  }
  const complete = graph.tasks.every((task) => task.status === "completed");
  return (
    <section>
      <div className="flex items-center justify-between gap-2">
        <Title />
        <span className="text-xs text-muted-foreground">{graph.tasks.filter((task) => task.status === "completed").length}/{graph.tasks.length}</span>
      </div>
      <div className="grid gap-2 pt-3">
        {graph.tasks.map((task) => (
          <article className="rounded-lg border p-3" key={task.uuid}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold">{task.sequence}. {task.title}</p>
                <p className="pt-1 text-[11px] text-muted-foreground">{task.agentProfile} · {task.status}</p>
              </div>
              <TaskAction mutate={mutate.mutate} task={task} />
            </div>
            <div className="flex flex-wrap gap-1 pt-2">
              {task.scopePaths.map((path) => <span className="max-w-full truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]" key={path}>{path}</span>)}
            </div>
            {task.dependsOn.length ? <p className="pt-2 text-[10px] text-muted-foreground">Depends on {task.dependsOn.length} task{task.dependsOn.length === 1 ? "" : "s"}</p> : null}
          </article>
        ))}
      </div>
      {complete ? (
        <div className="grid grid-cols-2 gap-2 pt-3">
          <button className="rounded-md border px-2 py-2 text-xs hover:bg-muted" onClick={() => mutate.mutate(() => reviewAgentTaskGraph(run.uuid, "rework", "Parent review requested another task pass."))} type="button"><RotateCcwIcon className="mr-1 inline size-3" /> Rework</button>
          <button className="rounded-md bg-primary px-2 py-2 text-xs text-primary-foreground" onClick={() => mutate.mutate(() => reviewAgentTaskGraph(run.uuid, "approved", "Parent reviewed all completed child tasks."))} type="button"><CheckCircle2Icon className="mr-1 inline size-3" /> Approve</button>
        </div>
      ) : null}
      {graph.reviews[0] ? <p className="pt-2 text-[11px] text-muted-foreground">Latest parent review: {graph.reviews[0].decision}</p> : null}
    </section>
  );
}

function TaskAction({ mutate, task }: {
  mutate: (action: () => Promise<AgentTaskGraph>) => void;
  task: AgentTaskGraph["tasks"][number];
}) {
  if (task.status === "ready") return <button aria-label={`Start ${task.title}`} className="rounded border p-1 hover:bg-muted" onClick={() => mutate(() => startAgentTask(task.uuid))} type="button"><PlayIcon className="size-3" /></button>;
  if (task.status === "running") return <button aria-label={`Complete ${task.title}`} className="rounded border p-1 text-emerald-700 hover:bg-muted" onClick={() => mutate(() => finishAgentTask(task.uuid, "completed", "Scoped task completed."))} type="button"><CheckCircle2Icon className="size-3" /></button>;
  return task.status === "completed" ? <CheckCircle2Icon className="size-4 text-emerald-600" /> : <CircleDotDashedIcon className="size-4 text-muted-foreground" />;
}

function Title() {
  return <h3 className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"><GitForkIcon className="size-3.5" /> Task graph</h3>;
}

function starterTasks(run: AgentRunDetail) {
  return [
    { agentProfile: "planning", dependsOn: [], key: "inspect", objective: `Inspect the repository evidence for: ${run.objective}`, scopePaths: ["assist/", "README.md"], title: "Inspect and refine scope" },
    { agentProfile: "backend", dependsOn: ["inspect"], key: "backend", objective: "Implement the module-owned API and persistence slice.", scopePaths: ["apps/devkit/api/"], title: "Build backend slice" },
    { agentProfile: "frontend", dependsOn: ["inspect"], key: "frontend", objective: "Implement the Project Agent visual workflow.", scopePaths: ["apps/devkit/web/"], title: "Build frontend slice" },
    { agentProfile: "review", dependsOn: ["backend", "frontend"], key: "review", objective: "Run focused checks and review the integrated result.", scopePaths: ["test/", "tools/e2e/"], title: "Verify and review" }
  ];
}
