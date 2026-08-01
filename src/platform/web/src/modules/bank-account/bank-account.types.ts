export type BankAccountStatus = "active" | "inactive";

export type BankAccountRecord = {
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

export type BankAccountLookupRecord = Omit<BankAccountRecord, "currentBalance" | "openingBalance">;
export type BankAccountSavePayload = Omit<BankAccountRecord, "currentBalance" | "id" | "uuid">;

export type BankLedgerEntry = {
  amount: number;
  balance: number;
  bankAccountId: number;
  counterpartyBankAccountId: number | null;
  counterpartyBankAccountName: string | null;
  credit: number;
  date: string;
  debit: number;
  direction: "credit" | "debit";
  entryType: string;
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
  account: BankAccountRecord;
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
