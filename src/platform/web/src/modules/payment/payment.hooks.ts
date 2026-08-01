import { useQuery } from "@tanstack/react-query";
import { listPayments } from "./payment.services";
import type { PaymentListFilters } from "./payment.types";

export const paymentQueryKey = ["trades", "payment"] as const;

export function usePayments(filters: PaymentListFilters = {}) {
  return useQuery({
    queryFn: () => listPayments(filters),
    queryKey: [...paymentQueryKey, filters.lifecycle ?? "open", filters.search ?? ""]
  });
}
