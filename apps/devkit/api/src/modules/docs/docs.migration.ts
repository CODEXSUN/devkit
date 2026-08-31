import { sql, type Kysely } from "kysely";
import type { DevkitDatabase } from "../../database/schema.js";

export const docsMigration = {
  description: "Actor-scoped values for trusted MDX documentation forms.",
  key: "devkit.docs.sql.v1"
} as const;

export async function migrateDocsModule(database: Kysely<DevkitDatabase>) {
  await sql`CREATE TABLE IF NOT EXISTS devkit_docs_form_values (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    uuid CHAR(32) NOT NULL,
    actor_id VARCHAR(160) NOT NULL,
    page_slug VARCHAR(120) NOT NULL,
    form_key VARCHAR(120) NOT NULL,
    values_json LONGTEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_devkit_docs_form_values_uuid (uuid),
    UNIQUE KEY uq_devkit_docs_form_values_owner (actor_id, page_slug, form_key),
    KEY idx_devkit_docs_form_values_actor (actor_id, updated_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.execute(database);
  return docsMigration;
}
