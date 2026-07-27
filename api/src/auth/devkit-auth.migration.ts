import { sql, type Kysely } from "kysely";
import type { DevkitDatabase } from "../database/schema.js";

export const devkitAuthMigration = {
  key: "devkit.auth.foundation",
} as const;

export async function migrateDevkitAuthModule(
  database: Kysely<DevkitDatabase>,
) {
  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS devkit_users (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      email VARCHAR(240) NOT NULL,
      name VARCHAR(160) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(24) NOT NULL DEFAULT 'developer_admin',
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      last_login_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_devkit_users_uuid (uuid),
      UNIQUE KEY uq_devkit_users_email (email),
      KEY ix_devkit_users_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `,
    )
    .execute(database);
}
