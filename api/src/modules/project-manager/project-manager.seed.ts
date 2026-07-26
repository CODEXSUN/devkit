import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Kysely } from "kysely";
import type { DevkitDatabase } from "../../database/schema.js";
import type {
  ProjectManagerKind,
  ProjectManagerRecord,
  ProjectManagerRegistryGroup,
  ProjectManagerRegistryModule,
  ProjectManagerRegistryPlatform,
} from "./project-manager.types.js";

const sourceDir = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../project-manager-json",
);

const itemFiles: Record<ProjectManagerKind, string> = {
  activity: "activity-registry.json",
  discussion: "discussion-registry.json",
  issue: "issue-board.json",
  kanban: "kanban-board.json",
  project: "project-registry.json",
  release: "release-registry.json",
  review: "review-registry.json",
  task: "task-registry.json",
  timeline: "timeline-registry.json",
  todo: "todo-registry.json",
};

export async function seedProjectManagerModule(
  database: Kysely<DevkitDatabase>,
) {
  let records = 0;
  records += await seedPlatforms(database);
  records += await seedGroups(database);
  records += await seedModules(database);
  records += await seedItems(database);
  await attachLegacyRoadmapRecords(database);
  return { module: "devkit.project-manager", records };
}

async function seedPlatforms(database: Kysely<DevkitDatabase>) {
  if ((await count(database, "project_manager_registry_platforms")) > 0)
    return 0;
  const rows = await readJson<ProjectManagerRegistryPlatform[]>(
    "platform-registry.json",
  );
  if (rows.length) {
    await database
      .insertInto("project_manager_registry_platforms")
      .values(
        rows.map((row) => ({
          active: row.active ? 1 : 0,
          created_at: date(row.createdAt),
          description: row.description ?? "",
          name: row.name,
          platform_key: row.key,
          sort_order: Number(row.sortOrder) || 0,
          status: row.status || (row.active ? "active" : "inactive"),
          updated_at: date(row.updatedAt),
          uuid: importedUuid(row.id),
        })),
      )
      .execute();
  }
  return rows.length;
}

async function seedGroups(database: Kysely<DevkitDatabase>) {
  if ((await count(database, "project_manager_registry_groups")) > 0) return 0;
  const rows =
    await readJson<ProjectManagerRegistryGroup[]>("module-groups.json");
  if (rows.length) {
    await database
      .insertInto("project_manager_registry_groups")
      .values(
        rows.map((row) => ({
          active: row.active ? 1 : 0,
          created_at: date(row.createdAt),
          description: row.description ?? "",
          group_key: row.key,
          name: row.name,
          parent_group_uuid: null,
          platform_uuid: importedUuid(row.platformId),
          sort_order: Number(row.sortOrder) || 0,
          status: row.status || (row.active ? "active" : "inactive"),
          updated_at: date(row.updatedAt),
          uuid: importedUuid(row.id),
        })),
      )
      .execute();

    for (const row of rows.filter((item) => item.parentGroupId)) {
      await database
        .updateTable("project_manager_registry_groups")
        .set({ parent_group_uuid: importedUuid(row.parentGroupId) })
        .where("uuid", "=", importedUuid(row.id))
        .execute();
    }
  }
  return rows.length;
}

async function seedModules(database: Kysely<DevkitDatabase>) {
  if ((await count(database, "project_manager_registry_modules")) > 0) return 0;
  const rows = await readJson<ProjectManagerRegistryModule[]>(
    "module-registry.json",
  );
  if (rows.length) {
    await database
      .insertInto("project_manager_registry_modules")
      .values(
        rows.map((row) => ({
          active: row.active ? 1 : 0,
          created_at: date(row.createdAt),
          description: row.description ?? "",
          documentation_json: JSON.stringify(row.documentation ?? {}),
          group_uuid: importedUuid(row.groupId),
          module_key: row.key,
          module_type: row.moduleType ?? "module",
          name: row.name,
          parent_module_uuid: null,
          planning_notes_json: JSON.stringify(row.planningNotes ?? []),
          route_path: row.routePath ?? "",
          sort_order: Number(row.sortOrder) || 0,
          status: row.status || (row.active ? "active" : "inactive"),
          updated_at: date(row.updatedAt),
          uuid: importedUuid(row.id),
        })),
      )
      .execute();

    for (const row of rows.filter((item) => item.parentModuleId)) {
      await database
        .updateTable("project_manager_registry_modules")
        .set({ parent_module_uuid: importedUuid(row.parentModuleId) })
        .where("uuid", "=", importedUuid(row.id))
        .execute();
    }
  }
  return rows.length;
}

async function seedItems(database: Kysely<DevkitDatabase>) {
  const records = (
    await Promise.all(
      Object.entries(itemFiles).map(async ([kind, file]) => {
        const rows = await readJson<ProjectManagerRecord[]>(file);
        return rows.map((row) => ({
          ...row,
          kind: kind as ProjectManagerKind,
        }));
      }),
    )
  ).flat();

  let inserted = 0;
  for (const row of records) {
    const result = await database
      .insertInto("project_manager_items")
      .ignore()
      .values({
        active: row.active ? 1 : 0,
        assignee: row.assignee ?? "",
        created_at: date(row.createdAt),
        description: row.description ?? "",
        due_date: row.dueDate ?? "",
        item_key: row.key,
        item_type: row.type ?? "",
        kind: row.kind,
        lane: row.lane ?? "",
        module_key: row.moduleKey ?? "project-manager",
        priority: row.priority ?? "medium",
        reference_id: row.referenceId ?? "",
        reference_type: row.referenceType ?? "",
        sort_order: Number(row.sortOrder) || 0,
        start_date: row.startDate ?? "",
        status: row.status || "active",
        title: row.title,
        updated_at: date(row.updatedAt),
        uuid: importedUuid(row.id),
      })
      .execute();
    inserted += Number(result[0]?.numInsertedOrUpdatedRows ?? 0);
  }
  return inserted;
}

async function attachLegacyRoadmapRecords(database: Kysely<DevkitDatabase>) {
  const project = await database
    .selectFrom("project_manager_items")
    .select(["item_key"])
    .where("kind", "=", "project")
    .orderBy("sort_order", "asc")
    .executeTakeFirst();
  if (!project) return;

  await database
    .updateTable("project_manager_items")
    .set({
      reference_id: project.item_key,
      reference_type: "project",
    })
    .where("kind", "in", ["discussion", "issue"])
    .where("reference_id", "=", "")
    .where("reference_type", "=", "")
    .execute();
}

async function readJson<T>(file: string) {
  return JSON.parse(await readFile(join(sourceDir, file), "utf8")) as T;
}

async function count(
  database: Kysely<DevkitDatabase>,
  table:
    | "project_manager_items"
    | "project_manager_registry_groups"
    | "project_manager_registry_modules"
    | "project_manager_registry_platforms",
) {
  const row = await database
    .selectFrom(table)
    .select(({ fn }) => fn.countAll<number>().as("count"))
    .executeTakeFirstOrThrow();
  return Number(row.count);
}

function importedUuid(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}

function date(value: string) {
  return new Date(value);
}
