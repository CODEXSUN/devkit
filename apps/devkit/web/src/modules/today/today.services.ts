import { apiGet } from "../../shared/api/devkit-api";
import type {
  TodayGithubDashboard,
  TodayProjectManagerResult,
} from "./today.types";

export async function getTodaySources() {
  const [projectManager, repositories] = await Promise.all([
    apiGet<TodayProjectManagerResult>("/admin/project-manager/result"),
    apiGet<TodayGithubDashboard>("/github-dashboard/projects"),
  ]);
  return { projectManager, repositories };
}
