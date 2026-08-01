import { randomBytes } from "node:crypto";
import { sql, type Kysely } from "kysely";
import type { TradesDatabase } from "../../database/schema.js";
import type {
  BankAccount,
  BankAccountLookup,
  BankAccountSavePayload,
  BankAccountStatus,
  BankLedgerDirection,
  BankLedgerEntry,
  BankLedgerEntryType,
  BankLedgerSourcePayload,
  BankManualEntryPayload,
  BankStatement,
  BankTransferPayload
} from "./bank-account.types.js";

type AccountRow = {
  account_name: string;
  bank_name: string;
  branch: string;
  code: string;
  current_balance: number | string;
  id: number;
  ifsc: string;
  opening_balance: number | string;
  status: BankAccountStatus;
  uuid: string;
};

type EntryRow = {
  amount: number | string;
  bank_account_id: number;
  counterparty_bank_account_id: number | null;
  counterparty_bank_account_name: string | null;
  direction: BankLedgerDirection;
  entry_type: BankLedgerEntryType;
  id: number;
  narration: string;
  reconciled_at: Date | string | null;
  reference: string;
  source_module: string | null;
  source_record_id: number | null;
  transaction_date: Date | string;
  transfer_uuid: string | null;
  uuid: string;
};

export class BankAccountRepository {
  constructor(private readonly database: Kysely<TradesDatabase>) {}

  async list(search = "") {
    const term = `%${search.trim().toLowerCase()}%`;
    const result = await sql<AccountRow>`
      SELECT a.id,a.uuid,a.code,a.account_name,a.bank_name,a.ifsc,a.branch,a.opening_balance,a.status,
        COALESCE(SUM(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0) current_balance
      FROM trades_bank_accounts a
      LEFT JOIN trades_bank_ledger_entries e ON e.bank_account_id=a.id
      WHERE (${search.trim()}='' OR LOWER(a.code) LIKE ${term} OR LOWER(a.account_name) LIKE ${term}
        OR LOWER(a.bank_name) LIKE ${term} OR LOWER(a.ifsc) LIKE ${term} OR LOWER(a.branch) LIKE ${term})
      GROUP BY a.id,a.uuid,a.code,a.account_name,a.bank_name,a.ifsc,a.branch,a.opening_balance,a.status
      ORDER BY a.account_name,a.id
    `.execute(this.database);
    return result.rows.map(mapAccount);
  }

  async lookups() {
    const result = await sql<AccountRow>`
      SELECT a.id,a.uuid,a.code,a.account_name,a.bank_name,a.ifsc,a.branch,a.opening_balance,a.status,
        COALESCE(SUM(CASE WHEN e.direction='debit' THEN e.amount ELSE -e.amount END),0) current_balance
      FROM trades_bank_accounts a
      LEFT JOIN trades_bank_ledger_entries e ON e.bank_account_id=a.id
      WHERE a.status='active'
      GROUP BY a.id,a.uuid,a.code,a.account_name,a.bank_name,a.ifsc,a.branch,a.opening_balance,a.status
      ORDER BY a.account_name,a.id
    `.execute(this.database);
    return result.rows.map(mapLookup);
  }

  async find(id: number) {
    const rows = await this.list();
    return rows.find((row) => row.id === id) ?? null;
  }

  async create(input: BankAccountSavePayload, uuid: string) {
    return this.database.transaction().execute(async (transaction) => {
      const result = await sql`
        INSERT INTO trades_bank_accounts (uuid,code,account_name,bank_name,ifsc,branch,opening_balance,status)
        VALUES (${uuid},${input.code},${input.accountName},${input.bankName},${input.ifsc},${input.branch},${input.openingBalance},${input.status})
      `.execute(transaction);
      const id = Number(result.insertId);
      if (input.openingBalance !== 0) {
        await insertEntry(transaction, {
          amount: Math.abs(input.openingBalance),
          bankAccountId: id,
          date: new Date().toISOString().slice(0, 10),
          direction: input.openingBalance >= 0 ? "debit" : "credit",
          entryType: "opening",
          narration: "Opening balance",
          reference: `OPEN-${input.code}`
        });
      }
      return (await new BankAccountRepository(transaction).find(id))!;
    });
  }

  async update(id: number, input: BankAccountSavePayload) {
    return this.database.transaction().execute(async (transaction) => {
      await sql`
        UPDATE trades_bank_accounts SET code=${input.code},account_name=${input.accountName},bank_name=${input.bankName},
          ifsc=${input.ifsc},branch=${input.branch},opening_balance=${input.openingBalance},status=${input.status}
        WHERE id=${id}
      `.execute(transaction);
      await sql`DELETE FROM trades_bank_ledger_entries WHERE bank_account_id=${id} AND entry_type='opening'`.execute(
        transaction
      );
      if (input.openingBalance !== 0) {
        await insertEntry(transaction, {
          amount: Math.abs(input.openingBalance),
          bankAccountId: id,
          date: new Date().toISOString().slice(0, 10),
          direction: input.openingBalance >= 0 ? "debit" : "credit",
          entryType: "opening",
          narration: "Opening balance",
          reference: `OPEN-${input.code}`
        });
      }
      return new BankAccountRepository(transaction).find(id);
    });
  }

  async setStatus(id: number, status: BankAccountStatus) {
    await sql`UPDATE trades_bank_accounts SET status=${status} WHERE id=${id}`.execute(
      this.database
    );
    return this.find(id);
  }

  async forceDelete(id: number) {
    const record = await this.find(id);
    if (!record) return null;
    await sql`DELETE FROM trades_bank_ledger_entries WHERE bank_account_id=${id} AND entry_type='opening'`.execute(
      this.database
    );
    await sql`DELETE FROM trades_bank_accounts WHERE id=${id}`.execute(this.database);
    return record;
  }

  async dependencyCount(id: number) {
    const result = await sql<{ count: number | string }>`
      SELECT COUNT(*) count FROM trades_bank_ledger_entries
      WHERE (bank_account_id=${id} OR counterparty_bank_account_id=${id}) AND entry_type<>'opening'
    `.execute(this.database);
    return Number(result.rows[0]?.count ?? 0);
  }

  async statement(id: number): Promise<BankStatement | null> {
    const account = await this.find(id);
    if (!account) return null;
    const result = await sql<EntryRow>`
      SELECT e.id,e.uuid,e.bank_account_id,e.transaction_date,e.entry_type,e.direction,e.amount,
        e.reference,e.narration,e.counterparty_bank_account_id,c.account_name counterparty_bank_account_name,
        e.transfer_uuid,e.source_module,e.source_record_id,e.reconciled_at
      FROM trades_bank_ledger_entries e
      LEFT JOIN trades_bank_accounts c ON c.id=e.counterparty_bank_account_id
      WHERE e.bank_account_id=${id}
      ORDER BY e.transaction_date,e.id
    `.execute(this.database);
    let balance = 0;
    let totalDebits = 0;
    let totalCredits = 0;
    let unreconciledCount = 0;
    const entries = result.rows.map((row) => {
      const amount = Number(row.amount);
      const debit = row.direction === "debit" ? amount : 0;
      const credit = row.direction === "credit" ? amount : 0;
      balance = money(balance + debit - credit);
      totalDebits = money(totalDebits + debit);
      totalCredits = money(totalCredits + credit);
      if (!row.reconciled_at && row.entry_type !== "opening") unreconciledCount += 1;
      return mapEntry(row, balance);
    });
    return {
      account: { ...account, currentBalance: balance },
      entries,
      summary: { closingBalance: balance, totalCredits, totalDebits, unreconciledCount }
    };
  }

  async createManualEntry(bankAccountId: number, input: BankManualEntryPayload) {
    await insertEntry(this.database, {
      amount: input.amount,
      bankAccountId,
      date: input.date,
      direction: input.entryType === "cash_deposit" ? "debit" : "credit",
      entryType: input.entryType,
      narration: input.narration,
      reference: input.reference
    });
    return this.statement(bankAccountId);
  }

  async transfer(input: BankTransferPayload) {
    const transferUuid = randomBytes(4).toString("hex");
    await this.database.transaction().execute(async (transaction) => {
      await insertEntry(transaction, {
        amount: input.amount,
        bankAccountId: input.fromBankAccountId,
        counterpartyBankAccountId: input.toBankAccountId,
        date: input.date,
        direction: "credit",
        entryType: "transfer_out",
        narration: input.narration,
        reference: input.reference,
        transferUuid
      });
      await insertEntry(transaction, {
        amount: input.amount,
        bankAccountId: input.toBankAccountId,
        counterpartyBankAccountId: input.fromBankAccountId,
        date: input.date,
        direction: "debit",
        entryType: "transfer_in",
        narration: input.narration,
        reference: input.reference,
        transferUuid
      });
    });
    return this.statement(input.fromBankAccountId);
  }

  async setReconciled(entryId: number, actorEmail: string, reconciled: boolean) {
    await sql`
      UPDATE trades_bank_ledger_entries SET reconciled_at=${reconciled ? new Date() : null},
        reconciled_by=${reconciled ? actorEmail : null} WHERE id=${entryId}
    `.execute(this.database);
    const result = await sql<{ bank_account_id: number }>`
      SELECT bank_account_id FROM trades_bank_ledger_entries WHERE id=${entryId} LIMIT 1
    `.execute(this.database);
    return result.rows[0] ? this.statement(Number(result.rows[0].bank_account_id)) : null;
  }
}

export async function findActiveBankAccountLink(database: Kysely<TradesDatabase>, id: number) {
  const result = await sql<{
    account_name: string;
    bank_name: string;
    code: string;
    id: number;
    status: BankAccountStatus;
  }>`SELECT id,code,account_name,bank_name,status FROM trades_bank_accounts WHERE id=${id} LIMIT 1`.execute(
    database
  );
  const row = result.rows[0];
  return row
    ? {
        accountName: row.account_name,
        bankName: row.bank_name,
        code: row.code,
        id: Number(row.id),
        status: row.status
      }
    : null;
}

export async function syncBankLedgerSourceEntry(
  database: Kysely<TradesDatabase>,
  input: BankLedgerSourcePayload
) {
  await sql`
    INSERT INTO trades_bank_ledger_entries
      (uuid,bank_account_id,transaction_date,entry_type,direction,amount,reference,narration,source_module,source_record_id)
    VALUES
      (${randomBytes(4).toString("hex")},${input.bankAccountId},${input.date},${input.entryType},${input.direction},
       ${input.amount},${input.reference},${input.narration},${input.sourceModule},${input.sourceRecordId})
    ON DUPLICATE KEY UPDATE bank_account_id=VALUES(bank_account_id),transaction_date=VALUES(transaction_date),
      entry_type=VALUES(entry_type),direction=VALUES(direction),amount=VALUES(amount),reference=VALUES(reference),
      narration=VALUES(narration)
  `.execute(database);
}

export async function deleteBankLedgerSourceEntry(
  database: Kysely<TradesDatabase>,
  sourceModule: "deposit" | "payment",
  sourceRecordId: number
) {
  await sql`DELETE FROM trades_bank_ledger_entries WHERE source_module=${sourceModule} AND source_record_id=${sourceRecordId}`.execute(
    database
  );
}

async function insertEntry(
  database: Kysely<TradesDatabase>,
  input: {
    amount: number;
    bankAccountId: number;
    counterpartyBankAccountId?: number;
    date: string;
    direction: BankLedgerDirection;
    entryType: BankLedgerEntryType;
    narration: string;
    reference: string;
    transferUuid?: string;
  }
) {
  await sql`
    INSERT INTO trades_bank_ledger_entries
      (uuid,bank_account_id,transaction_date,entry_type,direction,amount,reference,narration,counterparty_bank_account_id,transfer_uuid)
    VALUES (${randomBytes(4).toString("hex")},${input.bankAccountId},${input.date},${input.entryType},${input.direction},
      ${input.amount},${input.reference},${input.narration},${input.counterpartyBankAccountId ?? null},${input.transferUuid ?? null})
  `.execute(database);
}

function mapAccount(row: AccountRow): BankAccount {
  return {
    accountName: row.account_name,
    bankName: row.bank_name,
    branch: row.branch,
    code: row.code,
    currentBalance: Number(row.current_balance),
    id: Number(row.id),
    ifsc: row.ifsc,
    openingBalance: Number(row.opening_balance),
    status: row.status,
    uuid: row.uuid
  };
}

function mapLookup(row: AccountRow): BankAccountLookup {
  const account = mapAccount(row);
  return {
    accountName: account.accountName,
    bankName: account.bankName,
    branch: account.branch,
    code: account.code,
    id: account.id,
    ifsc: account.ifsc,
    status: account.status,
    uuid: account.uuid
  };
}

function mapEntry(row: EntryRow, balance: number): BankLedgerEntry {
  const amount = Number(row.amount);
  return {
    amount,
    balance,
    bankAccountId: Number(row.bank_account_id),
    counterpartyBankAccountId: row.counterparty_bank_account_id
      ? Number(row.counterparty_bank_account_id)
      : null,
    counterpartyBankAccountName: row.counterparty_bank_account_name,
    credit: row.direction === "credit" ? amount : 0,
    date: toDate(row.transaction_date),
    debit: row.direction === "debit" ? amount : 0,
    direction: row.direction,
    entryType: row.entry_type,
    id: Number(row.id),
    narration: row.narration,
    reconciledAt: row.reconciled_at ? new Date(row.reconciled_at).toISOString() : null,
    reference: row.reference,
    sourceModule: row.source_module,
    sourceRecordId: row.source_record_id ? Number(row.source_record_id) : null,
    transferUuid: row.transfer_uuid,
    uuid: row.uuid
  };
}

function toDate(value: Date | string) {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
}

function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
