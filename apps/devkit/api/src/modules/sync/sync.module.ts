import { defineModule } from "@codexsun/framework/modules";
import type { DevkitModuleDependencies } from "../../module-dependencies.js";
import { registerSyncRoutes } from "./sync.routes.js";

export const syncModule = defineModule<DevkitModuleDependencies>({
  key: "devkit.sync",
  label: "DevKit Cloud Sync",
  register: ({ app }) => registerSyncRoutes(app)
});
