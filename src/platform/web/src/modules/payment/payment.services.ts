import { apiDelete, apiGet, apiPost, apiPut } from "../../shared/api/trades-api";
import type { PaymentListFilters, PaymentRecord, PaymentSavePayload } from "./payment.types";

const paymentPath = "/trades/payments";

export function listPayments(filters: PaymentListFilters = {}) {
  const query = new URLSearchParams();
  if (filters.search?.trim()) query.set("search", filters.search.trim());
  if (filters.lifecycle) query.set("lifecycle", filters.lifecycle);
  return apiGet<PaymentRecord[]>(`${paymentPath}${query.size ? `?${query.toString()}` : ""}`);
}

export function createPayment(payload: PaymentSavePayload) {
  return apiPost<PaymentRecord>(paymentPath, payload);
}

export function updatePayment(id: number, payload: PaymentSavePayload) {
  return apiPut<PaymentRecord>(`${paymentPath}/${id}`, payload);
}

export function activatePayment(id: number) {
  return apiPost<PaymentRecord>(`${paymentPath}/${id}/activate`);
}

export function deactivatePayment(id: number) {
  return apiPost<PaymentRecord>(`${paymentPath}/${id}/deactivate`);
}

export function forceDeletePayment(id: number) {
  return apiDelete<PaymentRecord>(`${paymentPath}/${id}/force`);
}

export function verifyPayment(id: number) {
  return apiPost<PaymentRecord>(`${paymentPath}/${id}/verify`);
}

export function settlePayment(id: number) {
  return apiPost<PaymentRecord>(`${paymentPath}/${id}/settle`);
}
