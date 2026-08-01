import { sql, type Kysely } from "kysely";
import type { TradesDatabase } from "../../database/schema.js";

export const depositMigration = {
  description: "Incoming deposit transactions.",
  key: "trades.deposit"
};

export async function migrateDepositModule(database: Kysely<TradesDatabase>) {
  await sql
    .raw(
      `
      CREATE TABLE IF NOT EXISTS trades_deposits (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        uuid CHAR(8) NOT NULL,
        transaction_date DATE NOT NULL,
        tg_code VARCHAR(80) NOT NULL,
        bank_account_id INT NULL,
        bank VARCHAR(180) NOT NULL,
        name VARCHAR(200) NULL,
        amount DECIMAL(18,2) NOT NULL,
        reference VARCHAR(180) NULL,
        status VARCHAR(24) NOT NULL DEFAULT 'active',
        verified_at DATETIME NULL,
        verified_by VARCHAR(190) NULL,
        settled_at DATETIME NULL,
        settled_by VARCHAR(190) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY trades_deposits_uuid_unique (uuid),
        UNIQUE KEY trades_deposits_tg_code_unique (tg_code),
        KEY trades_deposits_date_index (transaction_date),
        KEY trades_deposits_reference_index (reference)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `
    )
    .execute(database);

  await ensureBankAccountLink(
    database,
    "trades_deposits",
    "trades_deposits_bank_account_index",
    "trades_deposits_bank_account_fk"
  );
  await ensureLifecycleColumns(database);
  await ensureOptionalDetailsAndUniqueTgCode(database);
}

async function ensureLifecycleColumns(database: Kysely<TradesDatabase>) {
  for (const [column, definition] of [
    ["verified_at", "DATETIME NULL"],
    ["verified_by", "VARCHAR(190) NULL"],
    ["settled_at", "DATETIME NULL"],
    ["settled_by", "VARCHAR(190) NULL"]
  ] as const) {
    const existing = await sql<{ count: number | string }>`
      SELECT COUNT(*) count FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='trades_deposits' AND COLUMN_NAME=${column}
    `.execute(database);
    if (Number(existing.rows[0]?.count ?? 0) === 0) {
      await sql.raw(`ALTER TABLE trades_deposits ADD COLUMN ${column} ${definition}`).execute(database);
    }
  }
}

async function ensureOptionalDetailsAndUniqueTgCode(database: Kysely<TradesDatabase>) {
  await sql
    .raw(
      "ALTER TABLE trades_deposits MODIFY COLUMN name VARCHAR(200) NULL, MODIFY COLUMN reference VARCHAR(180) NULL"
    )
    .execute(database);
  const conflicts = await sql<{ count: number | string }>`
    SELECT COUNT(*) count FROM (
      SELECT UPPER(TRIM(tg_code)) normalized_code FROM trades_deposits
      GROUP BY UPPER(TRIM(tg_code)) HAVING COUNT(*) > 1 OR normalized_code=''
    ) conflicts
  `.execute(database);
  if (Number(conflicts.rows[0]?.count ?? 0) > 0) {
    throw new Error(
      "Cannot enforce unique deposit TG codes because duplicate or blank persisted codes exist."
    );
  }
  await sql`UPDATE trades_deposits SET tg_code=UPPER(TRIM(tg_code))`.execute(database);
  await dropIndexIfExists(database, "trades_deposits_reference_unique");
  await dropIndexIfExists(database, "trades_deposits_tg_code_index");
  const unique = await sql<{ count: number | string }>`
    SELECT COUNT(*) count FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='trades_deposits'
      AND INDEX_NAME='trades_deposits_tg_code_unique' AND NON_UNIQUE=0
  `.execute(database);
  if (Number(unique.rows[0]?.count ?? 0) === 0) {
    await sql
      .raw("ALTER TABLE trades_deposits ADD UNIQUE KEY trades_deposits_tg_code_unique (tg_code)")
      .execute(database);
  }
  const referenceIndex = await sql<{ count: number | string }>`
    SELECT COUNT(*) count FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='trades_deposits'
      AND INDEX_NAME='trades_deposits_reference_index'
  `.execute(database);
  if (Number(referenceIndex.rows[0]?.count ?? 0) === 0) {
    await sql
      .raw("ALTER TABLE trades_deposits ADD KEY trades_deposits_reference_index (reference)")
      .execute(database);
  }
}

async function dropIndexIfExists(database: Kysely<TradesDatabase>, index: string) {
  const result = await sql<{ count: number | string }>`
    SELECT COUNT(*) count FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='trades_deposits' AND INDEX_NAME=${index}
  `.execute(database);
  if (Number(result.rows[0]?.count ?? 0) > 0) {
    await sql.raw(`ALTER TABLE trades_deposits DROP INDEX ${index}`).execute(database);
  }
}

async function ensureBankAccountLink(
  database: Kysely<TradesDatabase>,
  table: string,
  index: string,
  constraint: string
) {
  const column = await sql<{ count: number | string }>`
    SELECT COUNT(*) count FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=${table} AND COLUMN_NAME='bank_account_id'
  `.execute(database);
  if (Number(column.rows[0]?.count ?? 0) === 0) {
    await sql
      .raw(`ALTER TABLE ${table} ADD COLUMN bank_account_id INT NULL AFTER tg_code`)
      .execute(database);
  }
  const key = await sql<{ count: number | string }>`
    SELECT COUNT(*) count FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=${table} AND INDEX_NAME=${index}
  `.execute(database);
  if (Number(key.rows[0]?.count ?? 0) === 0) {
    await sql.raw(`ALTER TABLE ${table} ADD KEY ${index} (bank_account_id)`).execute(database);
  }
  const foreignKey = await sql<{ count: number | string }>`
    SELECT COUNT(*) count FROM information_schema.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=${table} AND CONSTRAINT_NAME=${constraint}
  `.execute(database);
  if (Number(foreignKey.rows[0]?.count ?? 0) === 0) {
    await sql
      .raw(
        `ALTER TABLE ${table} ADD CONSTRAINT ${constraint} FOREIGN KEY (bank_account_id) REFERENCES trades_bank_accounts(id)`
      )
      .execute(database);
  }
}
