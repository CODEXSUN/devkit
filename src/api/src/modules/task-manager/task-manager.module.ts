import { defineModule } from "@codexsun/framework/modules";
import type { DevkitModuleDependencies } from "../../module-dependencies.js";
import { registerTaskManagerRoutes } from "./task-manager.routes.js";
export const taskManagerModule = defineModule<DevkitModuleDependencies>({
  key: "devkit.task-manager",
  label: "Task Manager",
  register({ app }) {
    return registerTaskManagerRoutes(app);
  }
});
