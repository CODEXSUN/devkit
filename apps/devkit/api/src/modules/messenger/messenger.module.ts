import { defineModule } from "@codexsun/framework/modules";
import type { DevkitModuleDependencies } from "../../module-dependencies.js";
import { registerMessengerRoutes } from "./messenger.routes.js";

export const messengerModule = defineModule<DevkitModuleDependencies>({ key: "devkit.messenger", label: "Messenger", register: ({ app }) => registerMessengerRoutes(app) });
