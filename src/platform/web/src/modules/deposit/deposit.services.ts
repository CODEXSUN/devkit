import { apiDelete, apiGet, apiPost, apiPut } from "../../shared/api/trades-api";
import type { DepositListFilters, DepositRecord, DepositSavePayload } from "./deposit.types";

const depositPath = "/trades/deposits";

export function listDeposits(filters: DepositListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  if (filters.lifecycle) query.set("lifecycle", filters.lifecycle);
  return apiGet<DepositRecord[]>(`${depositPath}${query.size ? `?${query.toString()}` : ""}`);
}

export function createDeposit(payload: DepositSavePayload) {
  return apiPost<DepositRecord>(depositPath, payload);
}

export function updateDeposit(id: number, payload: DepositSavePayload) {
  return apiPut<DepositRecord>(`${depositPath}/${id}`, payload);
}

export function activateDeposit(id: number) {
  return apiPost<DepositRecord>(`${depositPath}/${id}/activate`);
}

export function deactivateDeposit(id: number) {
  return apiPost<DepositRecord>(`${depositPath}/${id}/deactivate`);
}

export function forceDeleteDeposit(id: number) {
  return apiDelete<DepositRecord>(`${depositPath}/${id}/force`);
}

export function verifyDeposit(id: number) {
  return apiPost<DepositRecord>(`${depositPath}/${id}/verify`);
}

export function settleDeposit(id: number) {
  return apiPost<DepositRecord>(`${depositPath}/${id}/settle`);
}
