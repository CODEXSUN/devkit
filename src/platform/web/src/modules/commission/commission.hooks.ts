import { useQuery } from "@tanstack/react-query";
import { listCommissions } from "./commission.services";
import type { CommissionDirection, CommissionListFilters } from "./commission.types";

export const commissionQueryKey = ["trades", "commission"] as const;
export function useCommissions(direction: CommissionDirection, filters: CommissionListFilters) {
  return useQuery({
    queryKey: [
      ...commissionQueryKey,
      direction,
      filters.dateFrom ?? "",
      filters.dateTo ?? "",
      filters.lifecycle ?? "open"
    ],
    queryFn: () => listCommissions(direction, filters)
  });
}
