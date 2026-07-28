import { apiGet } from "../../shared/api/devkit-api";
import type {
  GithubDashboard,
  GithubProjectDetails,
} from "./github-dashboard.types";

export const getGithubDashboard = () =>
  apiGet<GithubDashboard>("/github-dashboard/projects");

export const getGithubProject = (projectName: string) =>
  apiGet<GithubProjectDetails>(
    `/github-dashboard/projects/${encodeURIComponent(projectName)}`,
  );
