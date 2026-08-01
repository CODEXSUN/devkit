import { sql, type Kysely } from "kysely";
import type { TradesDatabase } from "../../database/schema.js";

export const bankAccountMigration = {
  description: "Bank accounts and debit/credit statement entries.",
  key: "trades.bank-account"
};

export async function migrateBankAccountModule(database: Kysely<TradesDatabase>) {
  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS trades_bank_accounts (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      code VARCHAR(40) NOT NULL,
      account_name VARCHAR(180) NOT NULL,
      bank_name VARCHAR(180) NOT NULL,
      ifsc VARCHAR(20) NOT NULL,
      branch VARCHAR(180) NOT NULL,
      opening_balance DECIMAL(18,2) NOT NULL DEFAULT 0,
      status VARCHAR(24) NOT NULL DEFAULT 'active',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY trades_bank_accounts_uuid_unique (uuid),
      UNIQUE KEY trades_bank_accounts_code_unique (code),
      KEY trades_bank_accounts_name_index (account_name),
      KEY trades_bank_accounts_bank_name_index (bank_name)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);

  await sql
    .raw(
      `
    CREATE TABLE IF NOT EXISTS trades_bank_ledger_entries (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      uuid CHAR(8) NOT NULL,
      bank_account_id INT NOT NULL,
      transaction_date DATE NOT NULL,
      entry_type VARCHAR(32) NOT NULL,
      direction VARCHAR(12) NOT NULL,
      amount DECIMAL(18,2) NOT NULL,
      reference VARCHAR(180) NOT NULL,
      narration VARCHAR(300) NOT NULL DEFAULT '',
      counterparty_bank_account_id INT NULL,
      transfer_uuid CHAR(8) NULL,
      source_module VARCHAR(40) NULL,
      source_record_id INT NULL,
      reconciled_at DATETIME NULL,
      reconciled_by VARCHAR(180) NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY trades_bank_ledger_entries_uuid_unique (uuid),
      UNIQUE KEY trades_bank_ledger_entries_source_unique (source_module,source_record_id),
      KEY trades_bank_ledger_entries_account_date_index (bank_account_id,transaction_date,id),
      KEY trades_bank_ledger_entries_reference_index (reference),
      KEY trades_bank_ledger_entries_transfer_index (transfer_uuid),
      CONSTRAINT trades_bank_ledger_entries_account_fk FOREIGN KEY (bank_account_id)
        REFERENCES trades_bank_accounts(id),
      CONSTRAINT trades_bank_ledger_entries_counterparty_fk FOREIGN KEY (counterparty_bank_account_id)
        REFERENCES trades_bank_accounts(id)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `
    )
    .execute(database);
}
