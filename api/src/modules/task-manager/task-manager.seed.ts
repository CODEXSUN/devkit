import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { Kysely } from "kysely";
import type { DevkitDatabase } from "../../database/schema.js";
import type { Todo, TodoLookup } from "./task-manager.types.js";

const sourceDir = join(dirname(fileURLToPath(import.meta.url)), "../../../task-manager-json");
const scopeKey = "super-admin";

export async function seedTaskManagerModule(database: Kysely<DevkitDatabase>) {
  const todos = await seedTodos(database);
  const lookups = await seedLookups(database);
  return {
    module: "devkit.task-manager",
    records: todos + lookups
  };
}

async function seedTodos(database: Kysely<DevkitDatabase>) {
  const existing = await database
    .selectFrom("task_manager_todos")
    .select(({ fn }) => fn.countAll<number>().as("count"))
    .where("scope_key", "=", scopeKey)
    .executeTakeFirstOrThrow();
  if (Number(existing.count) > 0) return 0;

  const rows = await readJson<Todo[]>("super-admin-todos.json");
  if (rows.length) {
    await database
      .insertInto("task_manager_todos")
      .values(
        rows.map((row, index) => ({
          category: row.category ?? "work",
          created_at: date(row.createdAt),
          description: row.description ?? "",
          due_date: row.dueDate ?? "",
          group_name: row.groupName ?? "",
          position: Number.isInteger(row.position) ? row.position : index,
          priority: row.priority ?? "medium",
          scope_key: scopeKey,
          status: row.status ?? "open",
          title: row.title,
          updated_at: date(row.updatedAt),
          uuid: importedUuid(row.id)
        }))
      )
      .execute();
  }
  return rows.length;
}

async function seedLookups(database: Kysely<DevkitDatabase>) {
  const existing = await database
    .selectFrom("task_manager_lookups")
    .select(({ fn }) => fn.countAll<number>().as("count"))
    .where("scope_key", "=", scopeKey)
    .executeTakeFirstOrThrow();
  if (Number(existing.count) > 0) return 0;

  const rows = await readJson<TodoLookup[]>("super-admin-todo-lookups.json");
  if (rows.length) {
    await database
      .insertInto("task_manager_lookups")
      .values(
        rows.map((row) => ({
          created_at: date(row.createdAt),
          kind: row.kind,
          name: row.name,
          scope_key: scopeKey,
          uuid: importedUuid(row.id),
          value: row.value
        }))
      )
      .execute();
  }
  return rows.length;
}

async function readJson<T>(file: string) {
  return JSON.parse(await readFile(join(sourceDir, file), "utf8")) as T;
}

function importedUuid(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}

function date(value: string) {
  return new Date(value);
}
