import { sql, type Kysely } from "kysely";
import type { DevkitDatabase } from "../../database/schema.js";

export const honeyMigration = {
  description: "Actor-owned Honey conversations and reviewed memory.",
  key: "devkit.honey.sql.v2"
} as const;

export async function migrateHoneyModule(database: Kysely<DevkitDatabase>) {
  await sql`CREATE TABLE IF NOT EXISTS devkit_honey_threads (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(16) NOT NULL,
    actor_id VARCHAR(160) NOT NULL, title VARCHAR(240) NOT NULL,
    codex_thread_id VARCHAR(160) NULL, status VARCHAR(24) NOT NULL DEFAULT 'active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_devkit_honey_threads_uuid (uuid),
    KEY idx_devkit_honey_threads_actor (actor_id, updated_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS devkit_honey_messages (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(16) NOT NULL,
    thread_uuid CHAR(16) NOT NULL, actor_id VARCHAR(160) NOT NULL,
    role VARCHAR(16) NOT NULL, body TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_devkit_honey_messages_uuid (uuid),
    KEY idx_devkit_honey_messages_thread (thread_uuid, created_at),
    KEY idx_devkit_honey_messages_actor (actor_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS devkit_honey_memory (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY, uuid CHAR(16) NOT NULL,
    actor_id VARCHAR(160) NOT NULL, kind VARCHAR(40) NOT NULL,
    content TEXT NOT NULL, source_thread_uuid CHAR(16) NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_devkit_honey_memory_uuid (uuid),
    KEY idx_devkit_honey_memory_actor (actor_id, status, updated_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  return honeyMigration;
}
