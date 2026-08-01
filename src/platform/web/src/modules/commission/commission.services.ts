import { apiGet, apiPost, apiPut } from "../../shared/api/trades-api";
import type {
  CommissionDirection,
  CommissionEntryRecord,
  CommissionListFilters,
  CommissionListResponse,
  CommissionVariantRecord,
  CommissionVariantSavePayload
} from "./commission.types";

const path = "/trades/commissions";
export function listCommissions(
  direction: CommissionDirection,
  filters: CommissionListFilters = {}
) {
  const query = new URLSearchParams();
  if (filters.dateFrom) query.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) query.set("dateTo", filters.dateTo);
  if (filters.lifecycle) query.set("lifecycle", filters.lifecycle);
  const collection = direction === "deposit" ? "deposits" : "withdrawals";
  return apiGet<CommissionListResponse>(`${path}/${collection}${query.size ? `?${query}` : ""}`);
}
export function updateCommissionVariant(id: number, payload: CommissionVariantSavePayload) {
  return apiPut<CommissionVariantRecord>(`${path}/variants/${id}`, payload);
}
export function settleCommission(direction: CommissionDirection, id: number) {
  const collection = direction === "deposit" ? "deposits" : "withdrawals";
  return apiPost<CommissionEntryRecord>(`${path}/${collection}/${id}/settle`);
}
export function verifyCommission(direction: CommissionDirection, id: number) {
  const collection = direction === "deposit" ? "deposits" : "withdrawals";
  return apiPost<CommissionEntryRecord>(`${path}/${collection}/${id}/verify`);
}
