export type PaymentStatus = "active" | "inactive";
export type PaymentLifecycleFilter = "all" | "open" | "settled" | "unverified" | "verified";

export type PaymentRecord = {
  amount: number;
  bank: string;
  bankAccountId: number | null;
  bankCode: string | null;
  date: string;
  id: number;
  name: string | null;
  reference: string | null;
  status: PaymentStatus;
  settledAt: string | null;
  settledBy: string | null;
  tgCode: string;
  uuid: string;
  verifiedAt: string | null;
  verifiedBy: string | null;
};

export type PaymentSavePayload = {
  amount: number;
  bankAccountId: number;
  date: string;
  name: string | null;
  reference: string | null;
  status: PaymentStatus;
  tgCode: string;
};

export type PaymentListFilters = { lifecycle?: PaymentLifecycleFilter; search?: string };
