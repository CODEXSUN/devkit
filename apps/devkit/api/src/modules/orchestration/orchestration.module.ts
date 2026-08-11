import { defineModule } from "@codexsun/framework/modules";
import type { DevkitModuleDependencies } from "../../module-dependencies.js";
import { registerOrchestrationRoutes } from "./orchestration.routes.js";

export const orchestrationModule = defineModule<DevkitModuleDependencies>({
  key: "devkit.orchestration",
  label: "Engineering Orchestration",
  register({ app }) {
    return registerOrchestrationRoutes(app);
  }
});
