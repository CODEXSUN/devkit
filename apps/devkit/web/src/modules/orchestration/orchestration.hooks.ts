import { useQuery } from "@tanstack/react-query";
import { getOrchestrationCatalog } from "./orchestration.services";

export const orchestrationCatalogKey = ["devkit", "orchestration"] as const;

export function useOrchestrationCatalog() {
  return useQuery({
    queryFn: getOrchestrationCatalog,
    queryKey: orchestrationCatalogKey,
    refetchOnWindowFocus: false,
    staleTime: 60_000
  });
}
