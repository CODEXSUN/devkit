import { defineModule } from "@codexsun/framework/modules";
import type { DevkitModuleDependencies } from "../../module-dependencies.js";
import { registerDocsRoutes } from "./docs.routes.js";

export const docsModule = defineModule<DevkitModuleDependencies>({
  key: "devkit.docs",
  label: "Documentation",
  register: ({ app }) => registerDocsRoutes(app)
});
