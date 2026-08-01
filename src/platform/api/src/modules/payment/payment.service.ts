import { randomBytes } from "node:crypto";
import { AppError } from "@codexsun/framework/errors";
import { findActiveBankAccountLink } from "../bank-account/index.js";
import { PaymentRepository } from "./payment.repository.js";
import type {
  Payment,
  PaymentContext,
  PaymentListFilters,
  PaymentPersistencePayload,
  PaymentSavePayload,
  PaymentStatus
} from "./payment.types.js";

export class PaymentService {
  private readonly repository: PaymentRepository;

  constructor(private readonly context: PaymentContext) {
    this.repository = new PaymentRepository(context.database);
  }

  async list(filters: PaymentListFilters = {}) {
    await this.context.authorize("trades.payment.view");
    return this.repository.list(filters);
  }

  async get(id: string) {
    await this.context.authorize("trades.payment.view");
    return this.repository.find(id);
  }

  async create(input: PaymentSavePayload) {
    await this.context.authorize("trades.payment.create");
    const value = await this.normalize(input);
    const record = await this.save(() =>
      this.repository.create(value, randomBytes(4).toString("hex"))
    );
    await this.audit("created", record);
    return record;
  }

  async update(id: string, input: PaymentSavePayload) {
    await this.context.authorize("trades.payment.update");
    const current = await this.required(id);
    const value = await this.normalize(input);
    const record = (await this.save(() => this.repository.update(current.id, value)))!;
    await this.audit("updated", record);
    return record;
  }

  async setStatus(id: string, status: PaymentStatus) {
    await this.context.authorize("trades.payment.lifecycle");
    const current = await this.required(id);
    const record = (await this.repository.setStatus(current.id, status))!;
    await this.audit(status === "active" ? "restored" : "suspended", record);
    return record;
  }

  async verify(id: string) {
    await this.context.authorize("trades.payment.lifecycle");
    const current = await this.required(id);
    if (current.settledAt) throw AppError.conflict("Unsettle the payment before clearing verification.");
    const verified = !current.verifiedAt;
    const record = (await this.repository.setVerified(
      current.id,
      this.context.actorEmail,
      verified
    ))!;
    await this.audit(verified ? "verified" : "verification-cleared", record);
    return record;
  }

  async settle(id: string) {
    await this.context.authorize("trades.payment.lifecycle");
    const current = await this.required(id);
    const settled = !current.settledAt;
    if (settled && !current.verifiedAt)
      throw AppError.conflict("Verify the payment before settling it.");
    const record = (await this.repository.setSettled(
      current.id,
      this.context.actorEmail,
      settled
    ))!;
    await this.audit(settled ? "settled" : "settlement-cleared", record);
    return record;
  }

  async forceDelete(id: string) {
    await this.context.authorize("trades.payment.delete");
    const current = await this.required(id);
    const record = (await this.repository.forceDelete(current.id))!;
    await this.audit("force-deleted", record);
    return record;
  }

  private async required(id: string) {
    const record = await this.repository.find(id);
    if (!record) throw AppError.notFound("Payment was not found.");
    return record;
  }

  private async audit(action: string, record: Payment) {
    await this.context.audit({
      action,
      moduleKey: "trades.payment",
      recordId: record.id,
      recordLabel: record.name ? `${record.tgCode} · ${record.name}` : record.tgCode,
      recordUuid: record.uuid
    });
  }

  private async save<T>(work: () => Promise<T>) {
    try {
      return await work();
    } catch (error) {
      if (isDuplicate(error)) throw AppError.conflict("Payment TG code already exists.");
      throw error;
    }
  }

  private async normalize(input: PaymentSavePayload): Promise<PaymentPersistencePayload> {
    const amount = roundMoney(input.amount);
    if (amount <= 0) throw AppError.validation("Payment amount must be greater than zero.");
    const account = await findActiveBankAccountLink(this.context.database, input.bankAccountId);
    if (!account) throw AppError.notFound("Bank account was not found.");
    if (account.status !== "active") throw AppError.conflict("Bank account is inactive.");
    return {
      amount,
      bank: `${account.code} · ${account.accountName}`,
      bankAccountId: account.id,
      bankCode: account.code,
      date: input.date,
      name: optionalText(input.name),
      reference: optionalText(input.reference),
      status: input.status,
      tgCode: input.tgCode.trim().toUpperCase()
    };
  }
}

function optionalText(value: string | null) {
  const normalized = value?.trim();
  return normalized || null;
}

function roundMoney(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function isDuplicate(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ER_DUP_ENTRY"
  );
}
