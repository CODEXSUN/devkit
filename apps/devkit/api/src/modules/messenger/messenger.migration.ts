import { sql, type Kysely } from "kysely";
import type { DevkitDatabase } from "../../database/schema.js";

export const messengerMigration = { key: "devkit.messenger.sql.v1" } as const;

export async function migrateMessengerModule(database: Kysely<DevkitDatabase>) {
  await sql`CREATE TABLE IF NOT EXISTS devkit_messenger_messages (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(32) NOT NULL,
    actor_id VARCHAR(160) NOT NULL,
    body TEXT NOT NULL,
    client VARCHAR(20) NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_devkit_messenger_messages_uuid (uuid),
    KEY idx_devkit_messenger_actor_created (actor_id, created_at)
  )`.execute(database);
  return messengerMigration;
}
