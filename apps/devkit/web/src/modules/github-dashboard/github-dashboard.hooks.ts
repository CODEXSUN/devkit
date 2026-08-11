import { useQuery } from "@tanstack/react-query";
import {
  getGithubDashboard,
  getGithubProject,
} from "./github-dashboard.services";

export const githubDashboardKey = ["devkit", "github-dashboard"] as const;

export function useGithubDashboard() {
  return useQuery({
    queryFn: getGithubDashboard,
    queryKey: githubDashboardKey,
    refetchOnWindowFocus: false,
    staleTime: 15_000,
  });
}

export function useGithubProject(projectName: string | null) {
  return useQuery({
    enabled: Boolean(projectName),
    queryFn: () => getGithubProject(projectName ?? ""),
    queryKey: [...githubDashboardKey, projectName],
    staleTime: 5_000,
  });
}
