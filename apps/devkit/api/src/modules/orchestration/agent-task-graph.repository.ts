import { randomBytes } from "node:crypto";
import { AppError } from "@codexsun/framework/errors";
import type { Transaction } from "kysely";
import { getDevkitDatabase } from "../../database/devkit-database.js";
import type { DevkitDatabase } from "../../database/schema.js";
import type { AgentDecompositionInput } from "./orchestration.schemas.js";
import { agentRunRepository } from "./agent-run.repository.js";
import { agentWorktreeService } from "./agent-worktree.service.js";

type TaskStatus = "blocked" | "ready" | "running" | "completed" | "failed";

export class AgentTaskGraphRepository {
  private readonly database = getDevkitDatabase();

  async replace(parentRunUuid: string, actorId: string, input: AgentDecompositionInput) {
    await this.requireParent(parentRunUuid, actorId);
    validateGraph(input.tasks);
    await this.database.transaction().execute(async (transaction) => {
      await transaction.deleteFrom("devkit_agent_tasks")
        .where("parent_run_uuid", "=", parentRunUuid).execute();
      const ids = new Map(input.tasks.map((task) => [task.key, id()]));
      await transaction.insertInto("devkit_agent_tasks").values(input.tasks.map((task, index) => ({
        actor_id: actorId,
        agent_profile: task.agentProfile,
        child_run_uuid: null,
        completed_at: null,
        objective: task.objective,
        parent_run_uuid: parentRunUuid,
        result_summary: null,
        scope_json: JSON.stringify(normalizeScope(task.scopePaths)),
        sequence_no: index + 1,
        started_at: null,
        status: task.dependsOn.length ? "blocked" : "ready",
        task_key: task.key,
        title: task.title,
        uuid: ids.get(task.key) as string
      }))).execute();
      const dependencies = input.tasks.flatMap((task) => task.dependsOn.map((dependency) => ({
        depends_on_task_uuid: ids.get(dependency) as string,
        task_uuid: ids.get(task.key) as string
      })));
      if (dependencies.length) {
        await transaction.insertInto("devkit_agent_task_dependencies").values(dependencies).execute();
      }
      await transaction.updateTable("devkit_agent_runs").set({ review_status: "tasks_pending" })
        .where("uuid", "=", parentRunUuid).where("actor_id", "=", actorId).execute();
      await transaction.insertInto("devkit_agent_events").values({
        actor_id: actorId,
        event_type: "run.tasks.decomposed",
        payload_json: JSON.stringify({ count: input.tasks.length }),
        run_uuid: parentRunUuid,
        uuid: id()
      }).execute();
    });
    return this.find(parentRunUuid, actorId);
  }

  async start(taskUuid: string, actorId: string) {
    const task = await this.requireTask(taskUuid, actorId);
    if (task.status !== "ready") conflict("AGENT_TASK_NOT_READY", "The task dependencies are not complete.");
    const running = await this.database.selectFrom("devkit_agent_tasks").select(["scope_json", "title"])
      .where("parent_run_uuid", "=", task.parent_run_uuid).where("status", "=", "running").execute();
    const scope = parseScope(task.scope_json);
    const overlap = running.find((item) => scopesOverlap(scope, parseScope(item.scope_json)));
    if (overlap) conflict("AGENT_TASK_SCOPE_CONFLICT", `The task overlaps the running task: ${overlap.title}.`);
    const child = await agentRunRepository.createChild(task.parent_run_uuid, actorId, {
      agentProfile: task.agent_profile,
      objective: task.objective
    });
    if (!child.sourceRoot) {
      await agentRunRepository.fail(child.uuid, actorId, "The parent run has no repository workspace.");
      conflict("AGENT_PARENT_WORKSPACE_REQUIRED", "The parent run must prepare a repository workspace before task dispatch.");
    }
    try {
      const workspace = await agentWorktreeService.prepareChild({
        access: child.access, runId: child.uuid, sourceRoot: child.sourceRoot
      });
      await agentRunRepository.setWorkspace(child.uuid, actorId, workspace);
      await agentRunRepository.markDispatched(child.uuid, actorId, task.parent_run_uuid);
    } catch (error) {
      await agentRunRepository.fail(child.uuid, actorId, error instanceof Error ? error.message : "Child worktree preparation failed.");
      throw error;
    }
    await this.database.updateTable("devkit_agent_tasks").set({
      child_run_uuid: child.uuid, started_at: new Date(), status: "running"
    })
      .where("uuid", "=", taskUuid).where("actor_id", "=", actorId).execute();
    await this.recordEvent(task.parent_run_uuid, actorId, "run.task.started", { childRunUuid: child.uuid, taskUuid });
    return this.find(task.parent_run_uuid, actorId);
  }

  async finish(taskUuid: string, actorId: string, status: "completed" | "failed", resultSummary: string) {
    const task = await this.requireTask(taskUuid, actorId);
    if (task.status !== "running") conflict("AGENT_TASK_NOT_RUNNING", "Only a running task can finish.");
    await this.database.transaction().execute(async (transaction) => {
      await transaction.updateTable("devkit_agent_tasks").set({
        completed_at: new Date(), result_summary: resultSummary || null, status
      }).where("uuid", "=", taskUuid).where("actor_id", "=", actorId).execute();
      if (status === "completed") {
        await refreshReadyTasks(transaction, task.parent_run_uuid);
      }
      await transaction.insertInto("devkit_agent_events").values({
        actor_id: actorId, event_type: `run.task.${status}`,
        payload_json: JSON.stringify({ taskUuid }), run_uuid: task.parent_run_uuid, uuid: id()
      }).execute();
    });
    if (task.child_run_uuid) {
      if (status === "completed") await agentRunRepository.complete(task.child_run_uuid, actorId, resultSummary || "Scoped task completed.");
      else await agentRunRepository.fail(task.child_run_uuid, actorId, resultSummary || "Scoped task failed.");
    }
    return this.find(task.parent_run_uuid, actorId);
  }

  async review(parentRunUuid: string, actorId: string, decision: "approved" | "rework", note: string) {
    await this.requireParent(parentRunUuid, actorId);
    const tasks = await this.database.selectFrom("devkit_agent_tasks").select("status")
      .where("parent_run_uuid", "=", parentRunUuid).execute();
    if (!tasks.length) conflict("AGENT_TASKS_REQUIRED", "Decompose the parent run before review.");
    if (decision === "approved" && tasks.some((task) => task.status !== "completed")) {
      conflict("AGENT_TASKS_INCOMPLETE", "All child tasks must complete before parent approval.");
    }
    await this.database.transaction().execute(async (transaction) => {
      await transaction.insertInto("devkit_agent_parent_reviews").values({
        actor_id: actorId, decision, note, parent_run_uuid: parentRunUuid, uuid: id()
      }).execute();
      await transaction.updateTable("devkit_agent_runs").set({
        review_status: decision === "approved" ? "parent_approved" : "rework_required"
      }).where("uuid", "=", parentRunUuid).where("actor_id", "=", actorId).execute();
      await transaction.insertInto("devkit_agent_events").values({
        actor_id: actorId, event_type: `run.parent-review.${decision}`,
        payload_json: JSON.stringify({ note }), run_uuid: parentRunUuid, uuid: id()
      }).execute();
    });
    return this.find(parentRunUuid, actorId);
  }

  async find(parentRunUuid: string, actorId: string) {
    await this.requireParent(parentRunUuid, actorId);
    const [tasks, dependencies, reviews] = await Promise.all([
      this.database.selectFrom("devkit_agent_tasks").selectAll()
        .where("parent_run_uuid", "=", parentRunUuid).orderBy("sequence_no").execute(),
      this.database.selectFrom("devkit_agent_task_dependencies as dependency")
        .innerJoin("devkit_agent_tasks as task", "task.uuid", "dependency.task_uuid")
        .select(["dependency.task_uuid", "dependency.depends_on_task_uuid"])
        .where("task.parent_run_uuid", "=", parentRunUuid).execute(),
      this.database.selectFrom("devkit_agent_parent_reviews").selectAll()
        .where("parent_run_uuid", "=", parentRunUuid).orderBy("created_at", "desc").execute()
    ]);
    return {
      parentRunUuid,
      reviews: reviews.map((review) => ({
        createdAt: iso(review.created_at), decision: review.decision, note: review.note, uuid: review.uuid
      })),
      tasks: tasks.map((task) => ({
        agentProfile: task.agent_profile,
        childRunUuid: task.child_run_uuid,
        completedAt: iso(task.completed_at),
        dependsOn: dependencies.filter((item) => item.task_uuid === task.uuid)
          .map((item) => item.depends_on_task_uuid),
        key: task.task_key,
        objective: task.objective,
        resultSummary: task.result_summary,
        scopePaths: parseScope(task.scope_json),
        sequence: task.sequence_no,
        startedAt: iso(task.started_at),
        status: task.status as TaskStatus,
        title: task.title,
        uuid: task.uuid
      }))
    };
  }

  private async requireParent(uuid: string, actorId: string) {
    const run = await this.database.selectFrom("devkit_agent_runs").select(["uuid"])
      .where("uuid", "=", uuid).where("actor_id", "=", actorId).executeTakeFirst();
    if (!run) throw AppError.notFound("Parent Agent run was not found.");
    return run;
  }

  private async requireTask(uuid: string, actorId: string) {
    const task = await this.database.selectFrom("devkit_agent_tasks").selectAll()
      .where("uuid", "=", uuid).where("actor_id", "=", actorId).executeTakeFirst();
    if (!task) throw AppError.notFound("Agent task was not found.");
    return task;
  }

  private recordEvent(runUuid: string, actorId: string, eventType: string, payload: unknown) {
    return this.database.insertInto("devkit_agent_events").values({
      actor_id: actorId, event_type: eventType, payload_json: JSON.stringify(payload), run_uuid: runUuid, uuid: id()
    }).execute();
  }
}

async function refreshReadyTasks(transaction: Transaction<DevkitDatabase>, parentRunUuid: string) {
  const blocked = await transaction.selectFrom("devkit_agent_tasks").select("uuid")
    .where("parent_run_uuid", "=", parentRunUuid).where("status", "=", "blocked").execute();
  for (const task of blocked) {
    const incomplete = await transaction.selectFrom("devkit_agent_task_dependencies as dependency")
      .innerJoin("devkit_agent_tasks as required", "required.uuid", "dependency.depends_on_task_uuid")
      .select(({ fn }) => fn.countAll<number>().as("count"))
      .where("dependency.task_uuid", "=", task.uuid).where("required.status", "!=", "completed").executeTakeFirst();
    if (Number(incomplete?.count ?? 0) === 0) {
      await transaction.updateTable("devkit_agent_tasks").set({ status: "ready" }).where("uuid", "=", task.uuid).execute();
    }
  }
}

function validateGraph(tasks: AgentDecompositionInput["tasks"]) {
  const keys = new Set(tasks.map((task) => task.key));
  if (keys.size !== tasks.length) throw AppError.validation("Task keys must be unique.");
  for (const task of tasks) {
    if (task.dependsOn.includes(task.key)) throw AppError.validation(`Task ${task.key} cannot depend on itself.`);
    if (task.dependsOn.some((key) => !keys.has(key))) throw AppError.validation(`Task ${task.key} has an unknown dependency.`);
  }
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const byKey = new Map(tasks.map((task) => [task.key, task]));
  const visit = (key: string) => {
    if (visiting.has(key)) throw AppError.validation("Task dependencies must not contain a cycle.");
    if (visited.has(key)) return;
    visiting.add(key);
    for (const dependency of byKey.get(key)?.dependsOn ?? []) visit(dependency);
    visiting.delete(key);
    visited.add(key);
  };
  for (const task of tasks) visit(task.key);
}

function normalizeScope(paths: string[]) {
  return [...new Set(paths.map((path) => path.replaceAll("\\", "/").replace(/^\.\//u, "").replace(/\/$/u, "")))];
}

function scopesOverlap(left: string[], right: string[]) {
  return left.some((a) => right.some((b) => a === b || a.startsWith(`${b}/`) || b.startsWith(`${a}/`)));
}

function parseScope(value: string) {
  try { return JSON.parse(value) as string[]; } catch { return []; }
}

function conflict(code: string, message: string): never {
  throw new AppError({ code, message, statusCode: 409 });
}

function id() { return randomBytes(8).toString("hex"); }
function iso(value: Date | string | null) { return value ? new Date(value).toISOString() : null; }

export const agentTaskGraphRepository = new AgentTaskGraphRepository();
