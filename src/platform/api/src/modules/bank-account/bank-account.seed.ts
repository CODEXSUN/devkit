import { sql, type Kysely } from "kysely";
import type { TradesDatabase } from "../../database/schema.js";

export const bankAccountSeed = {
  description: "Migrate legacy transaction bank labels and ensure opening statement entries.",
  key: "trades.bank-account.seed"
};

export async function seedBankAccountModule(database: Kysely<TradesDatabase>) {
  await consolidateGeneratedLegacyAccounts(database);
  await linkTransactionsByAccountCode(database, "trades_deposits");
  await linkTransactionsByAccountCode(database, "trades_payments");
  await sql
    .raw(
      `
    INSERT INTO trades_bank_accounts (uuid,code,account_name,bank_name,ifsc,branch,opening_balance,status)
    SELECT LEFT(SHA2(CONCAT('legacy-bank:',legacy.bank),256),8),
      CONCAT('LEG-',UPPER(LEFT(SHA2(legacy.bank,256),6))),legacy.bank,legacy.bank,'UNKNOWN','Migrated',0,'active'
    FROM (
      SELECT DISTINCT bank FROM trades_deposits WHERE bank<>'' AND bank_account_id IS NULL
      UNION SELECT DISTINCT bank FROM trades_payments WHERE bank<>'' AND bank_account_id IS NULL
    ) legacy
    LEFT JOIN trades_bank_accounts account ON LOWER(account.account_name)=LOWER(legacy.bank)
    WHERE account.id IS NULL
    ON DUPLICATE KEY UPDATE uuid=VALUES(uuid)
  `
    )
    .execute(database);
  await sql
    .raw(
      `
    UPDATE trades_deposits transaction_row
    INNER JOIN trades_bank_accounts account ON LOWER(account.account_name)=LOWER(transaction_row.bank)
    SET transaction_row.bank_account_id=account.id
    WHERE transaction_row.bank_account_id IS NULL
  `
    )
    .execute(database);
  await sql
    .raw(
      `
    UPDATE trades_payments transaction_row
    INNER JOIN trades_bank_accounts account ON LOWER(account.account_name)=LOWER(transaction_row.bank)
    SET transaction_row.bank_account_id=account.id
    WHERE transaction_row.bank_account_id IS NULL
  `
    )
    .execute(database);
  await normalizeTransactionAccountLabels(database, "trades_deposits");
  await normalizeTransactionAccountLabels(database, "trades_payments");
  await syncExistingLedgerLinks(database, "deposit", "trades_deposits");
  await syncExistingLedgerLinks(database, "payment", "trades_payments");
  await sql
    .raw(
      `
    INSERT INTO trades_bank_ledger_entries
      (uuid,bank_account_id,transaction_date,entry_type,direction,amount,reference,narration,source_module,source_record_id)
    SELECT LEFT(SHA2(CONCAT('deposit:',transaction_row.uuid),256),8),transaction_row.bank_account_id,
      transaction_row.transaction_date,'deposit','debit',transaction_row.amount,
      COALESCE(NULLIF(transaction_row.reference,''),transaction_row.tg_code),
      CONCAT_WS(' · ',CONCAT('Deposit ',transaction_row.tg_code),NULLIF(transaction_row.name,''),NULLIF(transaction_row.reference,'')),
      'deposit',transaction_row.id
    FROM trades_deposits transaction_row
    LEFT JOIN trades_bank_ledger_entries entry ON entry.source_module='deposit' AND entry.source_record_id=transaction_row.id
    WHERE transaction_row.bank_account_id IS NOT NULL AND entry.id IS NULL
  `
    )
    .execute(database);
  await sql
    .raw(
      `
    INSERT INTO trades_bank_ledger_entries
      (uuid,bank_account_id,transaction_date,entry_type,direction,amount,reference,narration,source_module,source_record_id)
    SELECT LEFT(SHA2(CONCAT('payment:',transaction_row.uuid),256),8),transaction_row.bank_account_id,
      transaction_row.transaction_date,'payment','credit',transaction_row.amount,
      COALESCE(NULLIF(transaction_row.reference,''),transaction_row.tg_code),
      CONCAT_WS(' · ',CONCAT('Payment ',transaction_row.tg_code),NULLIF(transaction_row.name,''),NULLIF(transaction_row.reference,'')),
      'payment',transaction_row.id
    FROM trades_payments transaction_row
    LEFT JOIN trades_bank_ledger_entries entry ON entry.source_module='payment' AND entry.source_record_id=transaction_row.id
    WHERE transaction_row.bank_account_id IS NOT NULL AND entry.id IS NULL
  `
    )
    .execute(database);
  await sql
    .raw(
      `
    INSERT INTO trades_bank_ledger_entries
      (uuid,bank_account_id,transaction_date,entry_type,direction,amount,reference,narration)
    SELECT LEFT(SHA2(CONCAT('opening:',account.uuid),256),8),account.id,CURRENT_DATE,'opening',
      CASE WHEN account.opening_balance>=0 THEN 'debit' ELSE 'credit' END,ABS(account.opening_balance),
      CONCAT('OPEN-',account.code),'Opening balance'
    FROM trades_bank_accounts account
    LEFT JOIN trades_bank_ledger_entries entry ON entry.bank_account_id=account.id AND entry.entry_type='opening'
    WHERE account.opening_balance<>0 AND entry.id IS NULL
  `
    )
    .execute(database);
}

type AccountLinkRow = {
  account_name: string;
  branch: string;
  code: string;
  id: number;
  ifsc: string;
};

async function consolidateGeneratedLegacyAccounts(database: Kysely<TradesDatabase>) {
  const result = await sql<AccountLinkRow>`
    SELECT id,code,account_name,ifsc,branch FROM trades_bank_accounts ORDER BY id
  `.execute(database);
  const accounts = result.rows.map((row) => ({ ...row, id: Number(row.id) }));
  const generated = (account: AccountLinkRow) =>
    account.code.startsWith("LEG-") && account.ifsc === "UNKNOWN" && account.branch === "Migrated";
  const byCode = new Map(accounts.map((account) => [account.code.trim().toUpperCase(), account]));
  const canonicalByName = new Map(
    accounts
      .filter((account) => !generated(account))
      .map((account) => [account.account_name.trim().toUpperCase(), account])
  );

  const resolve = (account: AccountLinkRow, visited = new Set<number>()): AccountLinkRow | null => {
    if (visited.has(account.id)) return null;
    visited.add(account.id);
    const prefix = account.account_name.split("·")[0]?.trim().toUpperCase() ?? "";
    const direct = byCode.get(prefix) ?? canonicalByName.get(account.account_name.trim().toUpperCase());
    if (!direct || direct.id === account.id) return null;
    return generated(direct) ? (resolve(direct, visited) ?? direct) : direct;
  };

  await database.transaction().execute(async (transaction) => {
    for (const legacy of accounts.filter(generated)) {
      const target = resolve(legacy);
      if (!target) continue;
      const label = `${target.code} · ${target.account_name}`;
      await sql`DELETE FROM trades_bank_ledger_entries
        WHERE bank_account_id=${legacy.id} AND entry_type='opening'`.execute(transaction);
      await sql`UPDATE trades_deposits SET bank_account_id=${target.id},bank=${label}
        WHERE bank_account_id=${legacy.id}`.execute(transaction);
      await sql`UPDATE trades_payments SET bank_account_id=${target.id},bank=${label}
        WHERE bank_account_id=${legacy.id}`.execute(transaction);
      await sql`UPDATE trades_bank_ledger_entries SET bank_account_id=${target.id}
        WHERE bank_account_id=${legacy.id}`.execute(transaction);
      await sql`UPDATE trades_bank_ledger_entries SET counterparty_bank_account_id=${target.id}
        WHERE counterparty_bank_account_id=${legacy.id}`.execute(transaction);
      await sql`DELETE FROM trades_bank_accounts WHERE id=${legacy.id}`.execute(transaction);
    }
  });
}

async function linkTransactionsByAccountCode(
  database: Kysely<TradesDatabase>,
  table: "trades_deposits" | "trades_payments"
) {
  await sql
    .raw(
      `UPDATE ${table} transaction_row
       INNER JOIN trades_bank_accounts account
         ON UPPER(account.code)=UPPER(TRIM(SUBSTRING_INDEX(transaction_row.bank,'·',1)))
       SET transaction_row.bank_account_id=account.id
       WHERE transaction_row.bank_account_id IS NULL AND account.code NOT LIKE 'LEG-%'`
    )
    .execute(database);
}

async function normalizeTransactionAccountLabels(
  database: Kysely<TradesDatabase>,
  table: "trades_deposits" | "trades_payments"
) {
  await sql
    .raw(
      `UPDATE ${table} transaction_row
       INNER JOIN trades_bank_accounts account ON account.id=transaction_row.bank_account_id
       SET transaction_row.bank=CONCAT(account.code,' · ',account.account_name)`
    )
    .execute(database);
}

async function syncExistingLedgerLinks(
  database: Kysely<TradesDatabase>,
  sourceModule: "deposit" | "payment",
  table: "trades_deposits" | "trades_payments"
) {
  await sql
    .raw(
      `UPDATE trades_bank_ledger_entries entry
       INNER JOIN ${table} transaction_row
         ON entry.source_module='${sourceModule}' AND entry.source_record_id=transaction_row.id
       SET entry.bank_account_id=transaction_row.bank_account_id
       WHERE transaction_row.bank_account_id IS NOT NULL
         AND entry.bank_account_id<>transaction_row.bank_account_id`
    )
    .execute(database);
}
