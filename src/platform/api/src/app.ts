import { createApiApp, registerHealthRoute, registerRequestLogging } from "@codexsun/framework/api";
import { AppError } from "@codexsun/framework/errors";
import type { HealthCheck } from "@codexsun/framework/health";
import { registerModules } from "@codexsun/framework/modules";
import {
  devkitApiModuleKeys,
  registerDevkitApiForHost
} from "@codexsun/devkit-api";
import type { DevkitDatabase } from "@codexsun/devkit-api";
import type { Kysely } from "kysely";
import { registerAuthRoutes } from "./auth/auth.routes.js";
import { bootstrapTradesDatabase, closeTradesDatabase } from "./database/trades-database.js";
import { getTradesDatabase } from "./database/trades-database.js";
import { identityContext } from "./auth/identity-context.js";
import { env } from "./env.js";
import { permissionModule } from "./modules/permission/index.js";
import { rolePermissionModule } from "./modules/role-permission/index.js";
import { roleModule } from "./modules/role/index.js";
import { userRoleModule } from "./modules/user-role/index.js";
import { userModule } from "./modules/user/index.js";

const modules = [
  userModule,
  roleModule,
  permissionModule,
  userRoleModule,
  rolePermissionModule
];

export async function createApp() {
  console.info("[devkit.boot] bootstrap started");
  await bootstrapTradesDatabase();

  const app = await createApiApp({
    appName: "DevKit API",
    cookieSecret: env.JWT_SECRET,
    corsOrigins: platformWebOrigins(),
    environment: env.NODE_ENV,
    shutdownHooks: [closeTradesDatabase],
    tenantContext: false
  });
  const healthChecks: HealthCheck[] = [
    {
      name: "trades-api",
      check: () => ({
        details: {
          database: env.DB_NAME,
          modules: [...modules.map((module) => module.key), ...devkitApiModuleKeys],
          runtime: "single-client"
        },
        status: "ok"
      })
    }
  ];

  registerRequestLogging(app);
  registerHealthRoute(app, healthChecks);
  await registerAuthRoutes(app);
  await registerModules(
    modules,
    { app },
    {
      onRegister: (module) => console.info(`[module.register] ${module.key}`),
      onReady: (module) => console.info(`[module.ready] ${module.key}`)
    }
  );
  await app.register(
    async (devkitApp) =>
      registerDevkitApiForHost(devkitApp, {
        async authorize({ request }) {
          if (request.url.includes("/sync/cloud/")) return;
          await identityContext(request).authorize(devkitPermission(request));
        },
        async resolve(request) {
          const context = identityContext(request);
          const actor = await context.actorUser();
          if (!actor) throw AppError.unauthorized("Session expired. Please sign in again.");
          return {
            actor: {
              email: actor.email,
              id: actor.uuid,
              permissions: [],
              roles: [actor.role]
            },
            database: context.database as unknown as Kysely<DevkitDatabase>
          };
        },
        resolveCloudSync() {
          return {
            actor: {
              id: "devkit-cloud-sync",
              permissions: [],
              roles: ["system"]
            },
            database: getTradesDatabase() as unknown as Kysely<DevkitDatabase>
          };
        }
      }),
    { prefix: "/api/devkit" }
  );
  console.info("[devkit.boot] bootstrap completed");

  return app;
}

function platformWebOrigins() {
  const configuredOrigins = [env.PLATFORM_WEB_ORIGIN, ...env.PLATFORM_WEB_ORIGINS.split(",")];
  if (env.NODE_ENV !== "production") {
    configuredOrigins.push(
      `http://127.0.0.1:${env.PLATFORM_WEB_PORT}`,
      `http://localhost:${env.PLATFORM_WEB_PORT}`
    );
  }

  return Array.from(
    new Set(
      configuredOrigins
        .map((origin) => origin.trim())
        .filter(Boolean)
        .flatMap(localOriginAliases)
        .map((origin) => origin.trim().replace(/\/$/u, ""))
    )
  );
}

function devkitPermission(request: { method: string; url: string }) {
  const action = request.method === "GET" || request.method === "HEAD" ? "view" : "manage";
  if (request.url.includes("/task-manager/")) return `devkit.task-manager.${action}`;
  if (request.url.includes("/planning/")) return `devkit.planning.${action}`;
  if (request.url.includes("/github-dashboard/")) return "devkit.github-dashboard.view";
  if (request.url.includes("/sync/")) return `devkit.sync.${action}`;
  if (request.url.includes("/project-manager/registry/")) return `devkit.registry.${action}`;
  return `devkit.project-manager.${action}`;
}

function localOriginAliases(origin: string) {
  const origins = [origin];
  const url = new URL(origin);
  if (url.hostname === "localhost") {
    url.hostname = "127.0.0.1";
    origins.push(url.origin);
  } else if (url.hostname === "127.0.0.1") {
    url.hostname = "localhost";
    origins.push(url.origin);
  }
  return origins;
}
