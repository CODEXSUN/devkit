import { sql, type Kysely } from "kysely";
import type { DevkitDatabase } from "../../database/schema.js";

export const messengerMigration = { key: "devkit.messenger.sql.v6" } as const;

export async function migrateMessengerModule(database: Kysely<DevkitDatabase>) {
  await sql`CREATE TABLE IF NOT EXISTS devkit_messenger_messages (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(32) NOT NULL,
    actor_id VARCHAR(160) NOT NULL,
    recipient_actor_id VARCHAR(160) NULL,
    conversation_uuid CHAR(32) NULL,
    body TEXT NOT NULL,
    client VARCHAR(20) NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    delivered_at TIMESTAMP(3) NULL,
    read_at TIMESTAMP(3) NULL,
    UNIQUE KEY uq_devkit_messenger_messages_uuid (uuid),
    KEY idx_devkit_messenger_actor_created (actor_id, created_at),
    KEY idx_devkit_messenger_recipient_created (recipient_actor_id, created_at),
    KEY idx_devkit_messenger_conversation_created (conversation_uuid, created_at)
  )`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS devkit_messenger_conversations (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(32) NOT NULL,
    kind VARCHAR(16) NOT NULL,
    title VARCHAR(180) NOT NULL DEFAULT '',
    created_by_actor_id VARCHAR(160) NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_devkit_messenger_conversations_uuid (uuid),
    KEY idx_devkit_messenger_conversations_updated (updated_at)
  )`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS devkit_messenger_participants (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    conversation_uuid CHAR(32) NOT NULL,
    actor_id VARCHAR(160) NOT NULL,
    joined_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    last_read_at TIMESTAMP(3) NULL,
    muted_at TIMESTAMP(3) NULL,
    archived_at TIMESTAMP(3) NULL,
    UNIQUE KEY uq_devkit_messenger_participant (conversation_uuid, actor_id),
    KEY idx_devkit_messenger_participant_actor (actor_id, archived_at)
  )`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS devkit_messenger_activity (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(32) NOT NULL,
    conversation_uuid CHAR(32) NOT NULL,
    actor_id VARCHAR(160) NOT NULL,
    action VARCHAR(64) NOT NULL,
    details_json LONGTEXT NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_devkit_messenger_activity_uuid (uuid),
    KEY idx_devkit_messenger_activity_conversation (conversation_uuid, created_at),
    KEY idx_devkit_messenger_activity_actor (actor_id, created_at)
  )`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS devkit_messenger_attachments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(32) NOT NULL,
    message_uuid CHAR(32) NOT NULL,
    original_name VARCHAR(240) NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    size_bytes INT UNSIGNED NOT NULL,
    checksum CHAR(64) NOT NULL,
    storage_key VARCHAR(320) NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_devkit_messenger_attachment_uuid (uuid),
    UNIQUE KEY uq_devkit_messenger_attachment_storage (storage_key),
    KEY idx_devkit_messenger_attachment_message (message_uuid, created_at)
  )`.execute(database);
  await sql`CREATE TABLE IF NOT EXISTS devkit_messenger_reactions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(32) NOT NULL,
    message_uuid CHAR(32) NOT NULL,
    actor_id VARCHAR(160) NOT NULL,
    emoji VARCHAR(16) NOT NULL,
    created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_devkit_messenger_reaction_uuid (uuid),
    UNIQUE KEY uq_devkit_messenger_reaction_actor (message_uuid, actor_id, emoji),
    KEY idx_devkit_messenger_reaction_message (message_uuid, created_at)
  )`.execute(database);
  await sql`ALTER TABLE devkit_messenger_messages
    ADD COLUMN IF NOT EXISTS recipient_actor_id VARCHAR(160) NULL AFTER actor_id`.execute(database);
  await sql`CREATE INDEX IF NOT EXISTS idx_devkit_messenger_recipient_created
    ON devkit_messenger_messages (recipient_actor_id, created_at)`.execute(database);
  await sql`ALTER TABLE devkit_messenger_messages
    ADD COLUMN IF NOT EXISTS conversation_uuid CHAR(32) NULL AFTER recipient_actor_id`.execute(database);
  await sql`CREATE INDEX IF NOT EXISTS idx_devkit_messenger_conversation_created
    ON devkit_messenger_messages (conversation_uuid, created_at)`.execute(database);
  await sql`ALTER TABLE devkit_messenger_messages
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP(3) NULL AFTER created_at,
    ADD COLUMN IF NOT EXISTS read_at TIMESTAMP(3) NULL AFTER delivered_at`.execute(database);
  return messengerMigration;
}
