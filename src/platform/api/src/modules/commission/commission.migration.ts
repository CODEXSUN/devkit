import { createHash } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { TradesDatabase } from "../../database/schema.js";

export const commissionMigration = {
  description: "Common percentage variants and transaction confirmation commissions.",
  key: "trades.commission"
};

export async function migrateCommissionModule(database: Kysely<TradesDatabase>) {
  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS trades_commission_variants (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      code VARCHAR(40) NOT NULL,
      name VARCHAR(120) NOT NULL,
      percentage DECIMAL(8,4) NOT NULL DEFAULT 0,
      display_order INT NOT NULL DEFAULT 0,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY trades_commission_variants_uuid_unique (uuid),
      UNIQUE KEY trades_commission_variants_code_unique (code),
      KEY trades_commission_variants_order_index (display_order)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);
  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS trades_commission_entries (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      direction VARCHAR(24) NOT NULL,
      source_record_id INT NOT NULL,
      transaction_date DATE NOT NULL,
      tg_code VARCHAR(80) NOT NULL,
      name VARCHAR(200) NULL,
      reference VARCHAR(180) NULL,
      amount DECIMAL(18,2) NOT NULL,
      verified_at DATETIME NULL,
      verified_by VARCHAR(190) NULL,
      settled_at DATETIME NULL,
      settled_by VARCHAR(190) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY trades_commission_entries_uuid_unique (uuid),
      UNIQUE KEY trades_commission_entries_source_unique (direction,source_record_id),
      KEY trades_commission_entries_filter_index (direction,settled_at,transaction_date)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);
  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS trades_commission_entry_lines (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      commission_entry_id INT NOT NULL,
      commission_variant_id INT NOT NULL,
      percentage DECIMAL(8,4) NOT NULL,
      amount DECIMAL(18,2) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY trades_commission_entry_lines_uuid_unique (uuid),
      UNIQUE KEY trades_commission_entry_lines_variant_unique (commission_entry_id,commission_variant_id),
      CONSTRAINT trades_commission_entry_lines_entry_fk FOREIGN KEY (commission_entry_id)
        REFERENCES trades_commission_entries(id) ON DELETE CASCADE,
      CONSTRAINT trades_commission_entry_lines_variant_fk FOREIGN KEY (commission_variant_id)
        REFERENCES trades_commission_variants(id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);
  await ensureVerificationColumns(database);
  await sql
    .raw(
      "ALTER TABLE trades_commission_entries MODIFY COLUMN name VARCHAR(200) NULL, MODIFY COLUMN reference VARCHAR(180) NULL"
    )
    .execute(database);

  for (const variant of defaultVariants) {
    await sql`
      INSERT INTO trades_commission_variants (uuid,code,name,percentage,display_order,status)
      VALUES (${stable(variant.code)},${variant.code},${variant.name},${variant.percentage},${variant.order},'active')
      ON DUPLICATE KEY UPDATE name=VALUES(name),display_order=VALUES(display_order)
    `.execute(database);
  }

  await backfillSource(database, "deposit", "trades_deposits");
  await backfillSource(database, "withdraw", "trades_payments");
  await sql.raw("DROP TABLE IF EXISTS deposit_commissions").execute(database);
  await sql.raw("DROP TABLE IF EXISTS payment_commissions").execute(database);
  await sql.raw("DROP TABLE IF EXISTS trades_deposit_commissions").execute(database);
  await sql.raw("DROP TABLE IF EXISTS trades_payment_commissions").execute(database);
}

async function ensureVerificationColumns(database: Kysely<TradesDatabase>) {
  for (const [column, definition] of [
    ["verified_at", "DATETIME NULL"],
    ["verified_by", "VARCHAR(190) NULL"]
  ] as const) {
    const existing = await sql<{ count: number | string }>`
      SELECT COUNT(*) count FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='trades_commission_entries' AND COLUMN_NAME=${column}
    `.execute(database);
    if (Number(existing.rows[0]?.count ?? 0) === 0) {
      await sql.raw(`ALTER TABLE trades_commission_entries ADD COLUMN ${column} ${definition}`).execute(database);
    }
  }
}

const defaultVariants = [
  { code: "COMMISSION_1", name: "Commission 1", order: 1, percentage: 1 },
  { code: "COMMISSION_2", name: "Commission 2", order: 2, percentage: 2 },
  { code: "COMMISSION_3", name: "Commission 3", order: 3, percentage: 3 }
] as const;

function stable(value: string) {
  return createHash("sha256").update(`trades.commission.${value}`).digest("hex").slice(0, 8);
}

async function backfillSource(
  database: Kysely<TradesDatabase>,
  direction: "deposit" | "withdraw",
  table: "trades_deposits" | "trades_payments"
) {
  await sql
    .raw(
      `
    INSERT INTO trades_commission_entries
      (uuid,direction,source_record_id,transaction_date,tg_code,name,reference,amount)
    SELECT LEFT(SHA2(CONCAT('commission:${direction}:',source.uuid),256),8),'${direction}',source.id,
      source.transaction_date,source.tg_code,source.name,source.reference,source.amount
    FROM ${table} source
    ON DUPLICATE KEY UPDATE transaction_date=VALUES(transaction_date),tg_code=VALUES(tg_code),
      name=VALUES(name),reference=VALUES(reference),amount=VALUES(amount)
  `
    )
    .execute(database);
  await sql
    .raw(
      `
    INSERT INTO trades_commission_entry_lines
      (uuid,commission_entry_id,commission_variant_id,percentage,amount)
    SELECT LEFT(SHA2(CONCAT('commission-line:',entry.uuid,':',variant.uuid),256),8),entry.id,variant.id,
      variant.percentage,ROUND(entry.amount*variant.percentage/100,2)
    FROM trades_commission_entries entry CROSS JOIN trades_commission_variants variant
    WHERE entry.direction='${direction}' AND variant.status='active'
    ON DUPLICATE KEY UPDATE commission_entry_id=VALUES(commission_entry_id)
  `
    )
    .execute(database);
}
