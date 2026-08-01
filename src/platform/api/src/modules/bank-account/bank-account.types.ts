import type { TradesModuleContext } from "../../request-context.js";

export type BankAccountStatus = "active" | "inactive";
export type BankLedgerDirection = "credit" | "debit";
export type BankLedgerEntryType =
  | "cash_deposit"
  | "cash_withdrawal"
  | "deposit"
  | "opening"
  | "payment"
  | "transfer_in"
  | "transfer_out";

export type BankAccount = {
  accountName: string;
  bankName: string;
  branch: string;
  code: string;
  currentBalance: number;
  id: number;
  ifsc: string;
  openingBalance: number;
  status: BankAccountStatus;
  uuid: string;
};

export type BankAccountLookup = Pick<
  BankAccount,
  "accountName" | "bankName" | "branch" | "code" | "id" | "ifsc" | "status" | "uuid"
>;

export type BankAccountSavePayload = {
  accountName: string;
  bankName: string;
  branch: string;
  code: string;
  ifsc: string;
  openingBalance: number;
  status: BankAccountStatus;
};

export type BankLedgerEntry = {
  amount: number;
  balance: number;
  bankAccountId: number;
  counterpartyBankAccountId: number | null;
  counterpartyBankAccountName: string | null;
  credit: number;
  date: string;
  debit: number;
  direction: BankLedgerDirection;
  entryType: BankLedgerEntryType;
  id: number;
  narration: string;
  reconciledAt: string | null;
  reference: string;
  sourceModule: string | null;
  sourceRecordId: number | null;
  transferUuid: string | null;
  uuid: string;
};

export type BankStatement = {
  account: BankAccount;
  entries: BankLedgerEntry[];
  summary: {
    closingBalance: number;
    totalCredits: number;
    totalDebits: number;
    unreconciledCount: number;
  };
};

export type BankManualEntryPayload = {
  amount: number;
  date: string;
  entryType: "cash_deposit" | "cash_withdrawal";
  narration: string;
  reference: string;
};

export type BankTransferPayload = {
  amount: number;
  date: string;
  fromBankAccountId: number;
  narration: string;
  reference: string;
  toBankAccountId: number;
};

export type BankAccountContext = TradesModuleContext;

export type BankLedgerSourcePayload = {
  amount: number;
  bankAccountId: number;
  date: string;
  direction: BankLedgerDirection;
  entryType: "deposit" | "payment";
  narration: string;
  reference: string;
  sourceModule: "deposit" | "payment";
  sourceRecordId: number;
};
