export type CommissionDirection = "deposit" | "withdraw";
export type CommissionLifecycleFilter = "all" | "open" | "settled" | "unverified" | "verified";
export type CommissionVariantStatus = "active" | "inactive";
export type CommissionVariantRecord = {
  code: string;
  displayOrder: number;
  id: number;
  name: string;
  percentage: number;
  status: CommissionVariantStatus;
  uuid: string;
};
export type CommissionLineRecord = {
  amount: number;
  percentage: number;
  variantId: number;
  variantName: string;
};
export type CommissionEntryRecord = {
  amount: number;
  date: string;
  direction: CommissionDirection;
  id: number;
  lines: CommissionLineRecord[];
  name: string | null;
  reference: string | null;
  settledAt: string | null;
  settledBy: string | null;
  tgCode: string;
  totalCommission: number;
  uuid: string;
  verifiedAt: string | null;
  verifiedBy: string | null;
};
export type CommissionListResponse = {
  entries: CommissionEntryRecord[];
  totals: {
    amount: number;
    commission: number;
    variants: Array<{ amount: number; variantId: number }>;
  };
  variants: CommissionVariantRecord[];
};
export type CommissionListFilters = {
  dateFrom?: string;
  dateTo?: string;
  lifecycle?: CommissionLifecycleFilter;
};
export type CommissionVariantSavePayload = {
  name: string;
  percentage: number;
  status: CommissionVariantStatus;
};
