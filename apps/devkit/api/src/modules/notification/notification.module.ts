import { defineModule } from "@codexsun/framework/modules";
import type { DevkitModuleDependencies } from "../../module-dependencies.js";
import { registerNotificationRoutes } from "./notification.routes.js";

export const notificationModule = defineModule<DevkitModuleDependencies>({
  key: "devkit.notification",
  label: "Notifications",
  register: ({ app }) => registerNotificationRoutes(app)
});
