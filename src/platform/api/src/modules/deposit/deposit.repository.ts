import { sql, type Kysely } from "kysely";
import type { TradesDatabase } from "../../database/schema.js";
import { deleteBankLedgerSourceEntry, syncBankLedgerSourceEntry } from "../bank-account/index.js";
import { deleteCommissionSourceEntry, syncCommissionSourceEntry } from "../commission/index.js";
import type {
  Deposit,
  DepositListFilters,
  DepositPersistencePayload,
  DepositStatus
} from "./deposit.types.js";

type DepositRow = {
  amount: number | string;
  bank: string;
  bank_account_id: number | null;
  bank_code: string | null;
  id: number;
  name: string | null;
  reference: string | null;
  settled_at: Date | string | null;
  settled_by: string | null;
  status: DepositStatus;
  tg_code: string;
  transaction_date: Date | string;
  uuid: string;
  verified_at: Date | string | null;
  verified_by: string | null;
};

export class DepositRepository {
  constructor(private readonly database: Kysely<TradesDatabase>) {}

  async list(filters: DepositListFilters = {}) {
    const term = `%${(filters.search ?? "").trim().toLowerCase()}%`;
    const lifecycle = filters.lifecycle ?? "open";
    const result = await sql<DepositRow>`
      SELECT d.id,d.uuid,d.transaction_date,d.tg_code,d.bank,d.bank_account_id,ba.code bank_code,
        d.name,d.amount,d.reference,d.status,d.verified_at,d.verified_by,d.settled_at,d.settled_by
      FROM trades_deposits d
      LEFT JOIN trades_bank_accounts ba ON ba.id=d.bank_account_id
      WHERE (${lifecycle}='all' OR (${lifecycle}='open' AND d.settled_at IS NULL)
        OR (${lifecycle}='unverified' AND d.verified_at IS NULL AND d.settled_at IS NULL)
        OR (${lifecycle}='verified' AND d.verified_at IS NOT NULL AND d.settled_at IS NULL)
        OR (${lifecycle}='settled' AND d.settled_at IS NOT NULL))
        AND (${filters.search ?? ""}='' OR LOWER(d.tg_code) LIKE ${term}
        OR LOWER(d.bank) LIKE ${term} OR LOWER(COALESCE(d.name,'')) LIKE ${term}
        OR LOWER(COALESCE(d.reference,'')) LIKE ${term})
      ORDER BY d.transaction_date DESC,d.id DESC
    `.execute(this.database);
    return result.rows.map(mapDeposit);
  }

  async find(id: string | number) {
    const result = await sql<DepositRow>`
      SELECT d.id,d.uuid,d.transaction_date,d.tg_code,d.bank,d.bank_account_id,ba.code bank_code,
        d.name,d.amount,d.reference,d.status,d.verified_at,d.verified_by,d.settled_at,d.settled_by
      FROM trades_deposits d
      LEFT JOIN trades_bank_accounts ba ON ba.id=d.bank_account_id
      WHERE d.id=${Number(id)} LIMIT 1
    `.execute(this.database);
    return result.rows[0] ? mapDeposit(result.rows[0]) : null;
  }

  async create(input: DepositPersistencePayload, uuid: string) {
    return this.database.transaction().execute(async (transaction) => {
      const result = await sql`
        INSERT INTO trades_deposits
          (uuid,transaction_date,tg_code,bank_account_id,bank,name,amount,reference,status)
        VALUES
          (${uuid},${input.date},${input.tgCode},${input.bankAccountId},${input.bank},${input.name},${input.amount},${input.reference},${input.status})
      `.execute(transaction);
      const depositId = Number(result.insertId);
      await syncBankLedgerSourceEntry(transaction, {
        amount: input.amount,
        bankAccountId: input.bankAccountId,
        date: input.date,
        direction: "debit",
        entryType: "deposit",
        narration: depositNarration(input),
        reference: input.reference ?? input.tgCode,
        sourceModule: "deposit",
        sourceRecordId: depositId
      });
      await syncCommissionSourceEntry(transaction, {
        amount: input.amount,
        date: input.date,
        direction: "deposit",
        name: input.name,
        reference: input.reference,
        sourceRecordId: depositId,
        tgCode: input.tgCode
      });
      return (await new DepositRepository(transaction).find(depositId))!;
    });
  }

  async update(id: number, input: DepositPersistencePayload) {
    return this.database.transaction().execute(async (transaction) => {
      await sql`
        UPDATE trades_deposits SET transaction_date=${input.date},tg_code=${input.tgCode},
          bank_account_id=${input.bankAccountId},bank=${input.bank},name=${input.name},amount=${input.amount},
          reference=${input.reference},status=${input.status}
          ,verified_at=NULL,verified_by=NULL,settled_at=NULL,settled_by=NULL
        WHERE id=${id}
      `.execute(transaction);
      await syncBankLedgerSourceEntry(transaction, {
        amount: input.amount,
        bankAccountId: input.bankAccountId,
        date: input.date,
        direction: "debit",
        entryType: "deposit",
        narration: depositNarration(input),
        reference: input.reference ?? input.tgCode,
        sourceModule: "deposit",
        sourceRecordId: id
      });
      await syncCommissionSourceEntry(transaction, {
        amount: input.amount,
        date: input.date,
        direction: "deposit",
        name: input.name,
        reference: input.reference,
        sourceRecordId: id,
        tgCode: input.tgCode
      });
      return new DepositRepository(transaction).find(id);
    });
  }

  async setStatus(id: number, status: DepositStatus) {
    await sql`UPDATE trades_deposits SET status=${status} WHERE id=${id}`.execute(this.database);
    return this.find(id);
  }

  async setVerified(id: number, actorEmail: string, verified: boolean) {
    await sql`UPDATE trades_deposits SET verified_at=${verified ? new Date() : null},
      verified_by=${verified ? actorEmail : null} WHERE id=${id}`.execute(this.database);
    return this.find(id);
  }

  async setSettled(id: number, actorEmail: string, settled: boolean) {
    await sql`UPDATE trades_deposits SET settled_at=${settled ? new Date() : null},
      settled_by=${settled ? actorEmail : null} WHERE id=${id}`.execute(this.database);
    return this.find(id);
  }

  async forceDelete(id: number) {
    const record = await this.find(id);
    if (!record) return null;
    await this.database.transaction().execute(async (transaction) => {
      await deleteBankLedgerSourceEntry(transaction, "deposit", id);
      await deleteCommissionSourceEntry(transaction, "deposit", id);
      await sql`DELETE FROM trades_deposits WHERE id=${id}`.execute(transaction);
    });
    return record;
  }
}

function depositNarration(input: DepositPersistencePayload) {
  return [`Deposit ${input.tgCode}`, input.name, input.reference].filter(Boolean).join(" · ");
}

function mapDeposit(row: DepositRow): Deposit {
  return {
    amount: Number(row.amount),
    bank: row.bank,
    bankAccountId: row.bank_account_id ? Number(row.bank_account_id) : null,
    bankCode: row.bank_code,
    date: toDate(row.transaction_date),
    id: Number(row.id),
    name: row.name,
    reference: row.reference,
    settledAt: timestamp(row.settled_at),
    settledBy: row.settled_by,
    status: row.status,
    tgCode: row.tg_code,
    uuid: row.uuid,
    verifiedAt: timestamp(row.verified_at),
    verifiedBy: row.verified_by
  };
}

function timestamp(value: Date | string | null) {
  return value ? new Date(value).toISOString() : null;
}

function toDate(value: Date | string) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}
