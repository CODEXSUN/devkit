import { defineModule } from "@codexsun/framework/modules";
import type { DevkitModuleDependencies } from "../../module-dependencies.js";
import { registerPlanningRoutes } from "./planning.routes.js";

export const planningModule = defineModule<DevkitModuleDependencies>({
  key: "devkit.planning",
  label: "Planning",
  register: ({ app }) => registerPlanningRoutes(app),
});
