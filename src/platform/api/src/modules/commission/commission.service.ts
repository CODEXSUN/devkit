import { AppError } from "@codexsun/framework/errors";
import { CommissionRepository } from "./commission.repository.js";
import type {
  CommissionContext,
  CommissionDirection,
  CommissionListFilters,
  CommissionVariantSavePayload
} from "./commission.types.js";

export class CommissionService {
  private readonly repository: CommissionRepository;
  constructor(private readonly context: CommissionContext) {
    this.repository = new CommissionRepository(context.database);
  }

  async listDeposits(filters: CommissionListFilters) {
    await this.context.authorize("trades.commission.view");
    validateDates(filters);
    return this.repository.list("deposit", filters);
  }

  async listWithdrawals(filters: CommissionListFilters) {
    await this.context.authorize("trades.commission.view");
    validateDates(filters);
    return this.repository.list("withdraw", filters);
  }

  async variants() {
    await this.context.authorize("trades.commission.view");
    return this.repository.variants();
  }

  async updateVariant(id: string, input: CommissionVariantSavePayload) {
    await this.context.authorize("trades.commission.configure");
    const current = await this.repository.findVariant(Number(id));
    if (!current) throw AppError.notFound("Commission variant was not found.");
    const record = await this.repository.updateVariant(Number(id), {
      name: input.name.trim(),
      percentage: roundRate(input.percentage),
      status: input.status
    });
    await this.context.audit({
      action: "configured",
      moduleKey: "trades.commission",
      recordId: current.id,
      recordLabel: current.name,
      recordUuid: current.uuid
    });
    return record!;
  }

  settleDeposit(id: string) {
    return this.settle("deposit", id);
  }
  settleWithdrawal(id: string) {
    return this.settle("withdraw", id);
  }

  verifyDeposit(id: string) {
    return this.verify("deposit", id);
  }
  verifyWithdrawal(id: string) {
    return this.verify("withdraw", id);
  }

  private async verify(direction: CommissionDirection, id: string) {
    await this.context.authorize("trades.commission.verify");
    const current = await this.repository.findEntry(Number(id), direction);
    if (!current) throw AppError.notFound("Commission entry was not found.");
    if (current.settledAt)
      throw AppError.conflict("Unsettle the commission before clearing verification.");
    const verified = !current.verifiedAt;
    const record = (await this.repository.setVerified(
      direction,
      current.id,
      this.context.actorEmail,
      verified
    ))!;
    await this.context.audit({
      action: verified ? "verified" : "verification-cleared",
      moduleKey: "trades.commission",
      recordId: record.id,
      recordLabel: `${record.direction} - ${record.reference ?? record.tgCode}`,
      recordUuid: record.uuid
    });
    return record;
  }

  private async settle(direction: CommissionDirection, id: string) {
    await this.context.authorize("trades.commission.settle");
    const current = await this.repository.findEntry(Number(id), direction);
    if (!current)
      throw AppError.notFound(
        `${direction === "deposit" ? "Deposit" : "Withdrawal"} commission was not found.`
      );
    const settled = !current.settledAt;
    if (settled && !current.verifiedAt)
      throw AppError.conflict("Verify the commission before settling it.");
    const record = (await this.repository.setSettled(
      direction,
      current.id,
      this.context.actorEmail,
      settled
    ))!;
    await this.context.audit({
      action: settled ? "settled" : "settlement-cleared",
      moduleKey: "trades.commission",
      recordId: record.id,
      recordLabel: `${record.direction} - ${record.reference ?? record.tgCode}`,
      recordUuid: record.uuid
    });
    return record;
  }
}

function validateDates(filters: CommissionListFilters) {
  if (filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo) {
    throw AppError.validation("From date cannot be after to date.");
  }
}
function roundRate(value: number) {
  return Math.round((Number(value) + Number.EPSILON) * 10000) / 10000;
}
