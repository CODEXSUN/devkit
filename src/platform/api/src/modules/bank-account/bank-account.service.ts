import { randomBytes } from "node:crypto";
import { AppError } from "@codexsun/framework/errors";
import { BankAccountRepository } from "./bank-account.repository.js";
import type {
  BankAccount,
  BankAccountContext,
  BankAccountSavePayload,
  BankAccountStatus,
  BankManualEntryPayload,
  BankTransferPayload
} from "./bank-account.types.js";

export class BankAccountService {
  private readonly repository: BankAccountRepository;

  constructor(private readonly context: BankAccountContext) {
    this.repository = new BankAccountRepository(context.database);
  }

  async list(search = "") {
    await this.context.authorize("trades.bank-account.view");
    return this.repository.list(search);
  }

  async lookups() {
    await this.context.authorize("trades.bank-account.view");
    return this.repository.lookups();
  }

  async get(id: string) {
    await this.context.authorize("trades.bank-account.view");
    return this.required(id);
  }

  async statement(id: string) {
    await this.context.authorize("trades.bank-account.view");
    await this.required(id);
    return (await this.repository.statement(Number(id)))!;
  }

  async create(input: BankAccountSavePayload) {
    await this.context.authorize("trades.bank-account.create");
    const record = await this.save(() =>
      this.repository.create(normalizeAccount(input), randomBytes(4).toString("hex"))
    );
    await this.audit("created", record);
    return record;
  }

  async update(id: string, input: BankAccountSavePayload) {
    await this.context.authorize("trades.bank-account.update");
    const current = await this.required(id);
    const record = (await this.save(() =>
      this.repository.update(current.id, normalizeAccount(input))
    ))!;
    await this.audit("updated", record);
    return record;
  }

  async setStatus(id: string, status: BankAccountStatus) {
    await this.context.authorize("trades.bank-account.lifecycle");
    const current = await this.required(id);
    const record = (await this.repository.setStatus(current.id, status))!;
    await this.audit(status === "active" ? "restored" : "suspended", record);
    return record;
  }

  async forceDelete(id: string) {
    await this.context.authorize("trades.bank-account.delete");
    const current = await this.required(id);
    const dependencies = await this.repository.dependencyCount(current.id);
    if (dependencies > 0) {
      throw AppError.conflict("Bank account has statement entries and cannot be force deleted.");
    }
    const record = (await this.repository.forceDelete(current.id))!;
    await this.audit("force-deleted", record);
    return record;
  }

  async createManualEntry(id: string, input: BankManualEntryPayload) {
    await this.context.authorize("trades.bank-account.entry");
    const account = await this.requiredActive(id);
    const payload = normalizeManualEntry(input);
    const statement = (await this.repository.createManualEntry(account.id, payload))!;
    await this.audit(
      payload.entryType === "cash_deposit" ? "cash-deposited" : "cash-withdrawn",
      account
    );
    return statement;
  }

  async transfer(input: BankTransferPayload) {
    await this.context.authorize("trades.bank-account.transfer");
    if (input.fromBankAccountId === input.toBankAccountId) {
      throw AppError.validation("Transfer source and destination bank accounts must be different.");
    }
    const from = await this.requiredActive(String(input.fromBankAccountId));
    const to = await this.requiredActive(String(input.toBankAccountId));
    const payload = normalizeTransfer(input);
    const statement = (await this.repository.transfer(payload))!;
    await this.audit("transferred-out", from);
    await this.audit("transferred-in", to);
    return statement;
  }

  async setReconciled(entryId: string, reconciled: boolean) {
    await this.context.authorize("trades.bank-account.reconcile");
    const statement = await this.repository.setReconciled(
      Number(entryId),
      this.context.actorEmail,
      reconciled
    );
    if (!statement) throw AppError.notFound("Bank statement entry was not found.");
    await this.audit(reconciled ? "reconciled" : "reconciliation-cleared", statement.account);
    return statement;
  }

  private async required(id: string) {
    const record = await this.repository.find(Number(id));
    if (!record) throw AppError.notFound("Bank account was not found.");
    return record;
  }

  private async requiredActive(id: string) {
    const record = await this.required(id);
    if (record.status !== "active") throw AppError.conflict("Bank account is inactive.");
    return record;
  }

  private async audit(action: string, record: BankAccount) {
    await this.context.audit({
      action,
      moduleKey: "trades.bank-account",
      recordId: record.id,
      recordLabel: `${record.code} · ${record.accountName}`,
      recordUuid: record.uuid
    });
  }

  private async save<T>(work: () => Promise<T>) {
    try {
      return await work();
    } catch (error) {
      if (isDuplicate(error)) throw AppError.conflict("Bank account code already exists.");
      throw error;
    }
  }
}

function normalizeAccount(input: BankAccountSavePayload): BankAccountSavePayload {
  return {
    accountName: required(input.accountName, "Account name"),
    bankName: required(input.bankName, "Bank name"),
    branch: required(input.branch, "Branch"),
    code: required(input.code, "Bank code").toUpperCase(),
    ifsc: required(input.ifsc, "IFSC").toUpperCase(),
    openingBalance: money(input.openingBalance),
    status: input.status
  };
}

function normalizeManualEntry(input: BankManualEntryPayload): BankManualEntryPayload {
  const amount = money(input.amount);
  if (amount <= 0) throw AppError.validation("Bank entry amount must be greater than zero.");
  return {
    amount,
    date: input.date,
    entryType: input.entryType,
    narration: input.narration.trim(),
    reference: required(input.reference, "Reference")
  };
}

function normalizeTransfer(input: BankTransferPayload): BankTransferPayload {
  const amount = money(input.amount);
  if (amount <= 0) throw AppError.validation("Transfer amount must be greater than zero.");
  return {
    ...input,
    amount,
    narration: input.narration.trim(),
    reference: required(input.reference, "Reference")
  };
}

function required(value: string, label: string) {
  const normalized = value.trim();
  if (!normalized) throw AppError.validation(`${label} is required.`);
  return normalized;
}

function money(value: number) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) throw AppError.validation("Amount must be a valid number.");
  return Math.round((normalized + Number.EPSILON) * 100) / 100;
}

function isDuplicate(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ER_DUP_ENTRY"
  );
}
