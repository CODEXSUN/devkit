import { randomBytes } from "node:crypto";
import { AppError } from "@codexsun/framework/errors";
import type { Selectable } from "kysely";
import { getDevkitDatabase } from "../../database/devkit-database.js";
import type { PlanningBoardsTable } from "../../database/schema.js";
import type { PlanningBoard, PlanningScene } from "./planning.types.js";

const emptyScene: PlanningScene = { elements: [] };

export class PlanningRepository {
  private readonly database = getDevkitDatabase();

  async list(projectUuid?: string) {
    let query = this.database
      .selectFrom("devkit_planning_boards")
      .selectAll()
      .where("sync_status", "!=", "deleted");
    if (projectUuid) query = query.where("project_uuid", "=", projectUuid);
    return (await query.orderBy("updated_at", "desc").execute()).map(mapBoard);
  }

  async find(uuid: string) {
    const row = await this.database
      .selectFrom("devkit_planning_boards")
      .selectAll()
      .where("uuid", "=", uuid)
      .where("sync_status", "!=", "deleted")
      .executeTakeFirst();
    if (!row) throw AppError.notFound("Planning board was not found.");
    return mapBoard(row);
  }

  async create(
    input: { description: string; projectUuid: string | null; title: string },
    actor: string,
  ) {
    await this.requireProject(input.projectUuid);
    const uuid = randomBytes(4).toString("hex");
    await this.database
      .insertInto("devkit_planning_boards")
      .values({
        created_by: actor,
        description: input.description,
        project_uuid: input.projectUuid,
        scene_json: JSON.stringify(emptyScene),
        status: "active",
        title: input.title,
        updated_by: actor,
        uuid,
      })
      .executeTakeFirstOrThrow();
    return this.find(uuid);
  }

  async update(
    uuid: string,
    input: {
      description?: string | undefined;
      projectUuid?: string | null | undefined;
      scene?: PlanningScene | undefined;
      title?: string | undefined;
    },
    actor: string,
  ) {
    await this.find(uuid);
    if (input.projectUuid !== undefined)
      await this.requireProject(input.projectUuid);
    await this.database
      .updateTable("devkit_planning_boards")
      .set({
        ...(input.description === undefined
          ? {}
          : { description: input.description }),
        ...(input.projectUuid === undefined
          ? {}
          : { project_uuid: input.projectUuid }),
        ...(input.scene === undefined
          ? {}
          : { scene_json: JSON.stringify(input.scene) }),
        ...(input.title === undefined ? {} : { title: input.title }),
        sync_direction: "local",
        sync_status: "pending",
        sync_updated_at: new Date(),
        sync_version: (eb) => eb("sync_version", "+", 1),
        updated_at: new Date(),
        updated_by: actor,
      })
      .where("uuid", "=", uuid)
      .executeTakeFirst();
    return this.find(uuid);
  }

  async delete(uuid: string, actor: string) {
    const board = await this.find(uuid);
    await this.database
      .updateTable("devkit_planning_boards")
      .set({
        status: "archived",
        sync_direction: "local",
        sync_status: "deleted",
        sync_updated_at: new Date(),
        sync_version: (eb) => eb("sync_version", "+", 1),
        updated_at: new Date(),
        updated_by: actor,
      })
      .where("uuid", "=", uuid)
      .executeTakeFirst();
    return { deleted: true, uuid: board.uuid };
  }

  private async requireProject(projectUuid: string | null) {
    if (!projectUuid) return;
    const project = await this.database
      .selectFrom("devkit_project_manager_items")
      .select("uuid")
      .where("uuid", "=", projectUuid)
      .where("kind", "=", "project")
      .where("active", "=", 1)
      .where("sync_status", "!=", "deleted")
      .executeTakeFirst();
    if (!project)
      throw AppError.validation("Selected DevKit project was not found.");
  }
}

function mapBoard(row: Selectable<PlanningBoardsTable>): PlanningBoard {
  return {
    createdAt: new Date(row.created_at).toISOString(),
    createdBy: row.created_by,
    description: row.description,
    projectUuid: row.project_uuid,
    scene: JSON.parse(row.scene_json) as PlanningScene,
    status: row.status,
    title: row.title,
    updatedAt: new Date(row.updated_at).toISOString(),
    updatedBy: row.updated_by,
    uuid: row.uuid,
  };
}
