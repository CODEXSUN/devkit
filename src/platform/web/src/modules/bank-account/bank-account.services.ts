import { apiDelete, apiGet, apiPost, apiPut } from "../../shared/api/trades-api";
import type {
  BankAccountLookupRecord,
  BankAccountRecord,
  BankAccountSavePayload,
  BankManualEntryPayload,
  BankStatement,
  BankTransferPayload
} from "./bank-account.types";

const path = "/trades/bank-accounts";
export const listBankAccounts = () => apiGet<BankAccountRecord[]>(path);
export const listBankAccountLookups = () => apiGet<BankAccountLookupRecord[]>(`${path}/lookups`);
export const createBankAccount = (value: BankAccountSavePayload) =>
  apiPost<BankAccountRecord>(path, value);
export const updateBankAccount = (id: number, value: BankAccountSavePayload) =>
  apiPut<BankAccountRecord>(`${path}/${id}`, value);
export const activateBankAccount = (id: number) =>
  apiPost<BankAccountRecord>(`${path}/${id}/activate`);
export const deactivateBankAccount = (id: number) =>
  apiPost<BankAccountRecord>(`${path}/${id}/deactivate`);
export const forceDeleteBankAccount = (id: number) =>
  apiDelete<BankAccountRecord>(`${path}/${id}/force`);
export const getBankStatement = (id: number) => apiGet<BankStatement>(`${path}/${id}/statement`);
export const createBankEntry = (id: number, value: BankManualEntryPayload) =>
  apiPost<BankStatement>(`${path}/${id}/entries`, value);
export const transferBankFunds = (value: BankTransferPayload) =>
  apiPost<BankStatement>(`${path}/transfer`, value);
export const setBankEntryReconciled = (id: number, reconciled: boolean) =>
  apiPost<BankStatement>(
    `${path}/entries/${id}/${reconciled ? "reconcile" : "unreconcile"}`,
    undefined
  );
