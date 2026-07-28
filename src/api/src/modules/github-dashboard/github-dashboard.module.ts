import { defineModule } from "@codexsun/framework/modules";
import type { DevkitModuleDependencies } from "../../module-dependencies.js";
import { registerGithubDashboardRoutes } from "./github-dashboard.routes.js";

export const githubDashboardModule = defineModule<DevkitModuleDependencies>({
  key: "devkit.github-dashboard",
  label: "GitHub Dashboard",
  register: ({ app }) => registerGithubDashboardRoutes(app),
});
