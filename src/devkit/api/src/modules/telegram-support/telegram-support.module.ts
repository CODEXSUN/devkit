import { defineModule } from "@codexsun/framework/modules";
import type { DevkitModuleDependencies } from "../../module-dependencies.js";
import { registerTelegramSupportRoutes } from "./telegram-support.routes.js";
export const telegramSupportModule = defineModule<DevkitModuleDependencies>({ key: "devkit.telegram-support", label: "Telegram Support", register: ({ app }) => registerTelegramSupportRoutes(app) });
