import { sql, type Kysely } from "kysely";
import type { TradesDatabase } from "../../database/schema.js";

export const paymentMigration = {
  description: "Outgoing payment transactions.",
  key: "trades.payment"
};

export async function migratePaymentModule(database: Kysely<TradesDatabase>) {
  await sql
    .raw(
      `
      CREATE TABLE IF NOT EXISTS trades_payments (
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
        UNIQUE KEY trades_payments_uuid_unique (uuid),
        UNIQUE KEY trades_payments_tg_code_unique (tg_code),
        KEY trades_payments_date_index (transaction_date),
        KEY trades_payments_reference_index (reference)
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `
    )
    .execute(database);

  await ensureBankAccountLink(
    database,
    "trades_payments",
    "trades_payments_bank_account_index",
    "trades_payments_bank_account_fk"
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
      WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='trades_payments' AND COLUMN_NAME=${column}
    `.execute(database);
    if (Number(existing.rows[0]?.count ?? 0) === 0) {
      await sql.raw(`ALTER TABLE trades_payments ADD COLUMN ${column} ${definition}`).execute(database);
    }
  }
}

async function ensureOptionalDetailsAndUniqueTgCode(database: Kysely<TradesDatabase>) {
  await sql
    .raw(
      "ALTER TABLE trades_payments MODIFY COLUMN name VARCHAR(200) NULL, MODIFY COLUMN reference VARCHAR(180) NULL"
    )
    .execute(database);
  const conflicts = await sql<{ count: number | string }>`
    SELECT COUNT(*) count FROM (
      SELECT UPPER(TRIM(tg_code)) normalized_code FROM trades_payments
      GROUP BY UPPER(TRIM(tg_code)) HAVING COUNT(*) > 1 OR normalized_code=''
    ) conflicts
  `.execute(database);
  if (Number(conflicts.rows[0]?.count ?? 0) > 0) {
    throw new Error(
      "Cannot enforce unique payment TG codes because duplicate or blank persisted codes exist."
    );
  }
  await sql`UPDATE trades_payments SET tg_code=UPPER(TRIM(tg_code))`.execute(database);
  await dropIndexIfExists(database, "trades_payments_reference_unique");
  await dropIndexIfExists(database, "trades_payments_tg_code_index");
  const unique = await sql<{ count: number | string }>`
    SELECT COUNT(*) count FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='trades_payments'
      AND INDEX_NAME='trades_payments_tg_code_unique' AND NON_UNIQUE=0
  `.execute(database);
  if (Number(unique.rows[0]?.count ?? 0) === 0) {
    await sql
      .raw("ALTER TABLE trades_payments ADD UNIQUE KEY trades_payments_tg_code_unique (tg_code)")
      .execute(database);
  }
  const referenceIndex = await sql<{ count: number | string }>`
    SELECT COUNT(*) count FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='trades_payments'
      AND INDEX_NAME='trades_payments_reference_index'
  `.execute(database);
  if (Number(referenceIndex.rows[0]?.count ?? 0) === 0) {
    await sql
      .raw("ALTER TABLE trades_payments ADD KEY trades_payments_reference_index (reference)")
      .execute(database);
  }
}

async function dropIndexIfExists(database: Kysely<TradesDatabase>, index: string) {
  const result = await sql<{ count: number | string }>`
    SELECT COUNT(*) count FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='trades_payments' AND INDEX_NAME=${index}
  `.execute(database);
  if (Number(result.rows[0]?.count ?? 0) > 0) {
    await sql.raw(`ALTER TABLE trades_payments DROP INDEX ${index}`).execute(database);
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
