import { createApiApp, registerHealthRoute, registerRequestLogging } from "@codexsun/framework/api";
import { registerModules } from "@codexsun/framework/modules";
import { projectManagerModule } from "./modules/project-manager/index.js";
import { taskManagerModule } from "./modules/task-manager/index.js";
import { env } from "./env.js";

export async function createApp() {
  const app = await createApiApp({
    appName: "CODEXSUN Devkit API",
    cookieSecret: env.DEVKIT_COOKIE_SECRET,
    corsOrigins: localOriginAliases(env.DEVKIT_WEB_ORIGIN),
    environment: env.NODE_ENV
  });
  registerRequestLogging(app);
  registerHealthRoute(app, [{
    name: "devkit-api",
    check: () => ({ details: { modules: [projectManagerModule.key, taskManagerModule.key] }, status: "ok" })
  }]);
  await registerModules([projectManagerModule, taskManagerModule], { app });
  return app;
}

function localOriginAliases(origin: string) {
  const normalized = origin.replace(/\/$/u, "");
  const url = new URL(normalized);
  const origins = [normalized];
  if (url.hostname === "localhost") url.hostname = "127.0.0.1";
  else if (url.hostname === "127.0.0.1") url.hostname = "localhost";
  origins.push(url.origin);
  return [...new Set(origins)];
}
