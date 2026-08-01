import { defineModule } from "@codexsun/framework/modules";
import type { DevkitModuleDependencies } from "../../module-dependencies.js";
import { registerProjectManagerRoutes } from "./project-manager.routes.js";

export const projectManagerModule = defineModule<DevkitModuleDependencies>({
  key: "devkit.project-manager",
  label: "Project Manager",
  register({ app }) {
    return registerProjectManagerRoutes(app);
  }
});
