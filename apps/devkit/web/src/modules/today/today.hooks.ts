import { useQuery } from "@tanstack/react-query";
import { buildTodayDashboard } from "./today.dashboard";
import { getTodaySources } from "./today.services";

export const todayDashboardKey = ["devkit", "today"] as const;

export function useTodayDashboard() {
  return useQuery({
    queryFn: async () => {
      const { projectManager, repositories } = await getTodaySources();
      return buildTodayDashboard(projectManager, repositories);
    },
    queryKey: todayDashboardKey,
    refetchOnWindowFocus: false,
    staleTime: 15_000,
  });
}
