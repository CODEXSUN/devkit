import { useQuery } from "@tanstack/react-query";
import { listDeposits } from "./deposit.services";
import type { DepositListFilters } from "./deposit.types";

export const depositQueryKey = ["trades", "deposit"] as const;

export function useDeposits(filters: DepositListFilters = {}) {
  return useQuery({
    queryFn: () => listDeposits(filters),
    queryKey: [...depositQueryKey, filters.lifecycle ?? "open", filters.search ?? ""]
  });
}
