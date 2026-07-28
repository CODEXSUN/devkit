import { sql, type Kysely } from "kysely";
import { renameLegacyTable } from "../../database/database-utils.js";
import type { DevkitDatabase } from "../../database/schema.js";

export const taskManagerMigration = {
  description: "Task Manager todos, lookups, and audit activity.",
  key: "devkit.task-manager.sql.v2",
} as const;

export async function migrateTaskManagerModule(
  database: Kysely<DevkitDatabase>,
) {
  const tables = [
    ["task_manager_todos", "devkit_task_manager_todos"],
    ["task_manager_lookups", "devkit_task_manager_lookups"],
    ["task_manager_activity", "devkit_task_manager_activity"],
  ] as const;
  for (const [legacyName, ownedName] of tables) {
    await renameLegacyTable(database, legacyName, ownedName);
  }

  await sql`
    CREATE TABLE IF NOT EXISTS devkit_task_manager_todos (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      scope_key VARCHAR(80) NOT NULL,
      title VARCHAR(240) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(80) NOT NULL DEFAULT 'work',
      group_name VARCHAR(120) NOT NULL DEFAULT '',
      status VARCHAR(24) NOT NULL DEFAULT 'open',
      priority VARCHAR(24) NOT NULL DEFAULT 'medium',
      due_date VARCHAR(16) NOT NULL DEFAULT '',
      position INT NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_devkit_task_manager_todos_uuid (uuid),
      KEY idx_devkit_task_manager_todos_scope_order (scope_key, position, updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);

  await sql`
    CREATE TABLE IF NOT EXISTS devkit_task_manager_lookups (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      scope_key VARCHAR(80) NOT NULL,
      kind VARCHAR(24) NOT NULL,
      name VARCHAR(120) NOT NULL,
      value VARCHAR(120) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_devkit_task_manager_lookups_uuid (uuid),
      UNIQUE KEY uq_devkit_task_manager_lookups_scope_kind_name (scope_key, kind, name),
      UNIQUE KEY uq_devkit_task_manager_lookups_scope_kind_value (scope_key, kind, value)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);

  await sql`
    CREATE TABLE IF NOT EXISTS devkit_task_manager_activity (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      actor_email VARCHAR(240) NOT NULL,
      action VARCHAR(80) NOT NULL,
      record_uuid CHAR(8) NOT NULL,
      details_json LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_devkit_task_manager_activity_uuid (uuid),
      KEY idx_devkit_task_manager_activity_record (record_uuid, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);

  return taskManagerMigration;
}
