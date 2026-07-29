import { sql, type Kysely } from "kysely";
import type { DevkitDatabase } from "../../database/schema.js";

export const planningMigration = {
  description: "DevKit-owned project planning whiteboards.",
  key: "devkit.planning.sql.v1",
} as const;

export async function migratePlanningModule(database: Kysely<DevkitDatabase>) {
  await sql`
    CREATE TABLE IF NOT EXISTS devkit_planning_boards (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      project_uuid CHAR(8) NULL,
      title VARCHAR(240) NOT NULL,
      description TEXT NOT NULL,
      scene_json LONGTEXT NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(240) NOT NULL,
      updated_by VARCHAR(240) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      sync_direction VARCHAR(16) NOT NULL DEFAULT 'local',
      sync_status VARCHAR(24) NOT NULL DEFAULT 'pending',
      sync_version INT UNSIGNED NOT NULL DEFAULT 1,
      sync_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_devkit_planning_boards_uuid (uuid),
      KEY idx_devkit_planning_boards_project (project_uuid),
      KEY idx_devkit_planning_boards_status (status, updated_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);
  return planningMigration;
}
