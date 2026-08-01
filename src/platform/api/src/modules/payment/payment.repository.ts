import { sql, type Kysely } from "kysely";
import type { TradesDatabase } from "../../database/schema.js";
import { deleteBankLedgerSourceEntry, syncBankLedgerSourceEntry } from "../bank-account/index.js";
import { deleteCommissionSourceEntry, syncCommissionSourceEntry } from "../commission/index.js";
import type {
  Payment,
  PaymentListFilters,
  PaymentPersistencePayload,
  PaymentStatus
} from "./payment.types.js";

type PaymentRow = {
  amount: number | string;
  bank: string;
  bank_account_id: number | null;
  bank_code: string | null;
  id: number;
  name: string | null;
  reference: string | null;
  settled_at: Date | string | null;
  settled_by: string | null;
  status: PaymentStatus;
  tg_code: string;
  transaction_date: Date | string;
  uuid: string;
  verified_at: Date | string | null;
  verified_by: string | null;
};

export class PaymentRepository {
  constructor(private readonly database: Kysely<TradesDatabase>) {}

  async list(filters: PaymentListFilters = {}) {
    const term = `%${(filters.search ?? "").trim().toLowerCase()}%`;
    const lifecycle = filters.lifecycle ?? "open";
    const result = await sql<PaymentRow>`
      SELECT p.id,p.uuid,p.transaction_date,p.tg_code,p.bank,p.bank_account_id,ba.code bank_code,
        p.name,p.amount,p.reference,p.status,p.verified_at,p.verified_by,p.settled_at,p.settled_by
      FROM trades_payments p
      LEFT JOIN trades_bank_accounts ba ON ba.id=p.bank_account_id
      WHERE (${lifecycle}='all' OR (${lifecycle}='open' AND p.settled_at IS NULL)
        OR (${lifecycle}='unverified' AND p.verified_at IS NULL AND p.settled_at IS NULL)
        OR (${lifecycle}='verified' AND p.verified_at IS NOT NULL AND p.settled_at IS NULL)
        OR (${lifecycle}='settled' AND p.settled_at IS NOT NULL))
        AND (${filters.search ?? ""}='' OR LOWER(p.tg_code) LIKE ${term}
        OR LOWER(p.bank) LIKE ${term} OR LOWER(COALESCE(p.name,'')) LIKE ${term}
        OR LOWER(COALESCE(p.reference,'')) LIKE ${term})
      ORDER BY p.transaction_date DESC,p.id DESC
    `.execute(this.database);
    return result.rows.map(mapPayment);
  }

  async find(id: string | number) {
    const result = await sql<PaymentRow>`
      SELECT p.id,p.uuid,p.transaction_date,p.tg_code,p.bank,p.bank_account_id,ba.code bank_code,
        p.name,p.amount,p.reference,p.status,p.verified_at,p.verified_by,p.settled_at,p.settled_by
      FROM trades_payments p
      LEFT JOIN trades_bank_accounts ba ON ba.id=p.bank_account_id
      WHERE p.id=${Number(id)} LIMIT 1
    `.execute(this.database);
    return result.rows[0] ? mapPayment(result.rows[0]) : null;
  }

  async create(input: PaymentPersistencePayload, uuid: string) {
    return this.database.transaction().execute(async (transaction) => {
      const result = await sql`
        INSERT INTO trades_payments
          (uuid,transaction_date,tg_code,bank_account_id,bank,name,amount,reference,status)
        VALUES
          (${uuid},${input.date},${input.tgCode},${input.bankAccountId},${input.bank},${input.name},${input.amount},${input.reference},${input.status})
      `.execute(transaction);
      const paymentId = Number(result.insertId);
      await syncBankLedgerSourceEntry(transaction, {
        amount: input.amount,
        bankAccountId: input.bankAccountId,
        date: input.date,
        direction: "credit",
        entryType: "payment",
        narration: paymentNarration(input),
        reference: input.reference ?? input.tgCode,
        sourceModule: "payment",
        sourceRecordId: paymentId
      });
      await syncCommissionSourceEntry(transaction, {
        amount: input.amount,
        date: input.date,
        direction: "withdraw",
        name: input.name,
        reference: input.reference,
        sourceRecordId: paymentId,
        tgCode: input.tgCode
      });
      return (await new PaymentRepository(transaction).find(paymentId))!;
    });
  }

  async update(id: number, input: PaymentPersistencePayload) {
    return this.database.transaction().execute(async (transaction) => {
      await sql`
        UPDATE trades_payments SET transaction_date=${input.date},tg_code=${input.tgCode},
          bank_account_id=${input.bankAccountId},bank=${input.bank},name=${input.name},amount=${input.amount},
          reference=${input.reference},status=${input.status}
          ,verified_at=NULL,verified_by=NULL,settled_at=NULL,settled_by=NULL
        WHERE id=${id}
      `.execute(transaction);
      await syncBankLedgerSourceEntry(transaction, {
        amount: input.amount,
        bankAccountId: input.bankAccountId,
        date: input.date,
        direction: "credit",
        entryType: "payment",
        narration: paymentNarration(input),
        reference: input.reference ?? input.tgCode,
        sourceModule: "payment",
        sourceRecordId: id
      });
      await syncCommissionSourceEntry(transaction, {
        amount: input.amount,
        date: input.date,
        direction: "withdraw",
        name: input.name,
        reference: input.reference,
        sourceRecordId: id,
        tgCode: input.tgCode
      });
      return new PaymentRepository(transaction).find(id);
    });
  }

  async setStatus(id: number, status: PaymentStatus) {
    await sql`UPDATE trades_payments SET status=${status} WHERE id=${id}`.execute(this.database);
    return this.find(id);
  }

  async setVerified(id: number, actorEmail: string, verified: boolean) {
    await sql`UPDATE trades_payments SET verified_at=${verified ? new Date() : null},
      verified_by=${verified ? actorEmail : null} WHERE id=${id}`.execute(this.database);
    return this.find(id);
  }

  async setSettled(id: number, actorEmail: string, settled: boolean) {
    await sql`UPDATE trades_payments SET settled_at=${settled ? new Date() : null},
      settled_by=${settled ? actorEmail : null} WHERE id=${id}`.execute(this.database);
    return this.find(id);
  }

  async forceDelete(id: number) {
    const record = await this.find(id);
    if (!record) return null;
    await this.database.transaction().execute(async (transaction) => {
      await deleteBankLedgerSourceEntry(transaction, "payment", id);
      await deleteCommissionSourceEntry(transaction, "withdraw", id);
      await sql`DELETE FROM trades_payments WHERE id=${id}`.execute(transaction);
    });
    return record;
  }
}

function paymentNarration(input: PaymentPersistencePayload) {
  return [`Payment ${input.tgCode}`, input.name, input.reference].filter(Boolean).join(" · ");
}

function mapPayment(row: PaymentRow): Payment {
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
