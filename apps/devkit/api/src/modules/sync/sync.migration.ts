import { sql, type Kysely } from "kysely";
import type { DevkitDatabase } from "../../database/schema.js";

export const syncMigration = {
  description:
    "DevKit cloud tokens, local bindings, canonical snapshots, runs, conflicts, and per-record sync state.",
  key: "devkit.sync.sql.v1"
} as const;

const ownedTables = [
  "devkit_planning_boards",
  "devkit_planning_board_links",
  "devkit_planning_comments",
  "devkit_planning_reactions",
  "devkit_project_manager_items",
  "devkit_project_manager_registry_platforms",
  "devkit_project_manager_registry_groups",
  "devkit_project_manager_registry_modules",
  "devkit_project_manager_activity",
  "devkit_project_manager_attachments",
  "devkit_task_manager_todos",
  "devkit_task_manager_lookups",
  "devkit_task_manager_activity"
] as const;

export async function migrateSyncModule(database: Kysely<DevkitDatabase>) {
  for (const table of ownedTables) {
    await sql
      .raw(
        `
      ALTER TABLE ${table}
      ADD COLUMN IF NOT EXISTS sync_direction VARCHAR(16) NOT NULL DEFAULT 'local',
      ADD COLUMN IF NOT EXISTS sync_status VARCHAR(24) NOT NULL DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS sync_version INT UNSIGNED NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS sync_updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    `
      )
      .execute(database);
  }

  await sql`
    CREATE TABLE IF NOT EXISTS devkit_sync_tokens (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      label VARCHAR(160) NOT NULL,
      token_hash CHAR(64) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_by VARCHAR(240) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_used_at DATETIME NULL,
      UNIQUE KEY uq_devkit_sync_tokens_uuid (uuid),
      UNIQUE KEY uq_devkit_sync_tokens_hash (token_hash)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);

  await sql`
    CREATE TABLE IF NOT EXISTS devkit_sync_connections (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      server_id VARCHAR(160) NOT NULL,
      server_url VARCHAR(300) NOT NULL,
      encrypted_token TEXT NOT NULL,
      instance_id VARCHAR(160) NOT NULL,
      remote_revision INT UNSIGNED NOT NULL DEFAULT 0,
      status VARCHAR(24) NOT NULL DEFAULT 'bound',
      last_error TEXT NULL,
      last_verified_at DATETIME NULL,
      last_published_at DATETIME NULL,
      last_pulled_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_devkit_sync_connections_server (server_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);

  await sql`
    ALTER TABLE devkit_sync_connections
    ADD COLUMN IF NOT EXISTS last_verified_at DATETIME NULL AFTER last_error
  `.execute(database);

  await sql`
    CREATE TABLE IF NOT EXISTS devkit_sync_snapshots (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      server_id VARCHAR(160) NOT NULL,
      revision INT UNSIGNED NOT NULL,
      checksum CHAR(64) NOT NULL,
      payload_json LONGTEXT NOT NULL,
      published_by VARCHAR(160) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_devkit_sync_snapshots_revision (server_id, revision),
      KEY idx_devkit_sync_snapshots_latest (server_id, revision)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);

  await sql`
    CREATE TABLE IF NOT EXISTS devkit_sync_runs (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      direction VARCHAR(16) NOT NULL,
      status VARCHAR(24) NOT NULL,
      local_revision INT UNSIGNED NOT NULL,
      remote_revision INT UNSIGNED NOT NULL,
      record_count INT UNSIGNED NOT NULL DEFAULT 0,
      error_message TEXT NULL,
      started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME NULL,
      UNIQUE KEY uq_devkit_sync_runs_uuid (uuid),
      KEY idx_devkit_sync_runs_started (started_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);

  await sql`
    CREATE TABLE IF NOT EXISTS devkit_sync_conflicts (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      table_name VARCHAR(160) NOT NULL,
      record_uuid VARCHAR(160) NOT NULL,
      local_version INT UNSIGNED NOT NULL,
      remote_version INT UNSIGNED NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'open',
      details_json LONGTEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME NULL,
      UNIQUE KEY uq_devkit_sync_conflicts_uuid (uuid),
      KEY idx_devkit_sync_conflicts_status (status, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `.execute(database);

  return syncMigration;
}
