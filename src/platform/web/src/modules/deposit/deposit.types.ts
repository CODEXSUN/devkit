export type DepositStatus = "active" | "inactive";
export type DepositLifecycleFilter = "all" | "open" | "settled" | "unverified" | "verified";

export type DepositRecord = {
  amount: number;
  bank: string;
  bankAccountId: number | null;
  bankCode: string | null;
  date: string;
  id: number;
  name: string | null;
  reference: string | null;
  status: DepositStatus;
  settledAt: string | null;
  settledBy: string | null;
  tgCode: string;
  uuid: string;
  verifiedAt: string | null;
  verifiedBy: string | null;
};

export type DepositSavePayload = {
  amount: number;
  bankAccountId: number;
  date: string;
  name: string | null;
  reference: string | null;
  status: DepositStatus;
  tgCode: string;
};

export type DepositListFilters = { lifecycle?: DepositLifecycleFilter; search?: string };
