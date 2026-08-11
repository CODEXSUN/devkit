import { defineModule } from "@codexsun/framework/modules";
import type { DevkitModuleDependencies } from "../../module-dependencies.js";
import { registerSkillsRoutes } from "./skills.routes.js";

export const skillsModule = defineModule<DevkitModuleDependencies>({
  key: "devkit.skills",
  label: "Skill Library",
  register: ({ app }) => registerSkillsRoutes(app)
});
