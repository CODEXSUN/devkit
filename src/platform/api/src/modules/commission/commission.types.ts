import type { TradesModuleContext } from "../../request-context.js";

export type CommissionDirection = "deposit" | "withdraw";
export type CommissionLifecycleFilter = "all" | "open" | "settled" | "unverified" | "verified";
export type CommissionVariantStatus = "active" | "inactive";

export type CommissionVariant = {
  code: string;
  displayOrder: number;
  id: number;
  name: string;
  percentage: number;
  status: CommissionVariantStatus;
  uuid: string;
};

export type CommissionLine = {
  amount: number;
  percentage: number;
  variantId: number;
  variantName: string;
};

export type CommissionEntry = {
  amount: number;
  date: string;
  direction: CommissionDirection;
  id: number;
  lines: CommissionLine[];
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

export type CommissionList = {
  entries: CommissionEntry[];
  totals: {
    amount: number;
    commission: number;
    variants: Array<{ amount: number; variantId: number }>;
  };
  variants: CommissionVariant[];
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
export type CommissionSourcePayload = {
  amount: number;
  date: string;
  direction: CommissionDirection;
  name: string | null;
  reference: string | null;
  sourceRecordId: number;
  tgCode: string;
};
export type CommissionContext = TradesModuleContext;
