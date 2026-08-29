import { createApiApp, registerHealthRoute, registerRequestLogging } from "@codexsun/framework/api";
import { AppError } from "@codexsun/framework/errors";
import type { HealthCheck } from "@codexsun/framework/health";
import { registerModules } from "@codexsun/framework/modules";
import {
  bootstrapDevkitDatabase,
  configureNotificationRuntime,
  desktopNodeBroker,
  devkitApiModuleKeys,
  registerDevkitApiForHost,
  subscribeMessengerEvents,
  subscribeNotificationEvents
} from "@codexsun/devkit-api";
import type { DevkitDatabase } from "@codexsun/devkit-api";
import type { Kysely } from "kysely";
import { Server as SocketServer } from "socket.io";
import { registerAuthRoutes } from "./auth/auth.routes.js";
import { bootstrapPlatformDatabase, closePlatformDatabase } from "./database/platform-database.js";
import { getPlatformDatabase } from "./database/platform-database.js";
import { identityContext } from "./auth/identity-context.js";
import { env } from "./env.js";
import { verifyAuthToken } from "./auth/jwt.js";
import { permissionModule } from "./modules/permission/index.js";
import { rolePermissionModule } from "./modules/role-permission/index.js";
import { roleModule } from "./modules/role/index.js";
import { userRoleModule } from "./modules/user-role/index.js";
import { userModule } from "./modules/user/index.js";

const modules = [userModule, roleModule, permissionModule, userRoleModule, rolePermissionModule];

export async function createApp() {
  console.info("[devkit.boot] bootstrap started");
  await bootstrapPlatformDatabase();
  const database = getPlatformDatabase() as unknown as Kysely<DevkitDatabase>;
  await bootstrapDevkitDatabase(database);
  const closeNotifications = await configureNotificationRuntime({
    database,
    email: {
      fromEmail: env.MAIL_FROM_EMAIL,
      fromName: env.MAIL_FROM_NAME,
      host: env.MAIL_SMTP_HOST,
      password: env.MAIL_SMTP_PASSWORD,
      port: env.MAIL_SMTP_PORT,
      secure: env.MAIL_SMTP_SECURE === "1",
      username: env.MAIL_SMTP_USERNAME
    },
    redisUrl: env.REDIS_URL
  });

  const app = await createApiApp({
    appName: "DevKit API",
    cookieSecret: env.JWT_SECRET,
    corsOrigins: platformWebOrigins(),
    environment: env.NODE_ENV,
    shutdownHooks: [closeNotifications, closePlatformDatabase],
    tenantContext: false
  });
  registerNotificationSocket(app);
  registerMessengerSocket(app);
  registerDesktopNodeSocket(app);
  const healthChecks: HealthCheck[] = [
    {
      name: "devkit-api",
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
          if (request.url.includes("/sync/cloud/") || request.url.includes("/telegram/webhook"))
            return;
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
            database: getPlatformDatabase() as unknown as Kysely<DevkitDatabase>
          };
        },
        resolvePublicWebhook() {
          return {
            actor: { id: "telegram-webhook", permissions: [], roles: ["system"] },
            database: getPlatformDatabase() as unknown as Kysely<DevkitDatabase>
          };
        }
      }),
    { prefix: "/api/devkit" }
  );
  console.info("[devkit.boot] bootstrap completed");

  return app;
}

function registerDesktopNodeSocket(app: Awaited<ReturnType<typeof createApiApp>>) {
  const io = new SocketServer(app.server, {
    cors: { credentials: true, origin: platformWebOrigins() },
    path: "/api/devkit/orchestration/node/socket.io"
  });
  io.use((socket, next) => {
    const authorization = String(socket.handshake.auth.token ?? "");
    const actor = verifyAuthToken(authorization.replace(/^Bearer\s+/iu, ""));
    if (!actor) return next(new Error("Desktop node authentication failed."));
    socket.data.actorId = actor.userId;
    next();
  });
  io.on("connection", (socket) => desktopNodeBroker.attach(String(socket.data.actorId), socket));
  app.addHook("onClose", async () => io.close());
}

function registerMessengerSocket(app: Awaited<ReturnType<typeof createApiApp>>) {
  const io = new SocketServer(app.server, {
    cors: { credentials: true, origin: platformWebOrigins() },
    path: "/api/devkit/messenger/socket.io"
  });
  io.use((socket, next) => {
    const authorization = String(socket.handshake.auth.token ?? "");
    const actor = verifyAuthToken(authorization.replace(/^Bearer\s+/iu, ""));
    if (!actor) return next(new Error("Messenger authentication failed."));
    socket.data.actorId = actor.userId;
    socket.join(`actor:${actor.userId}`);
    next();
  });
  const unsubscribe = subscribeMessengerEvents((event) => {
    io.to(`actor:${event.actorId}`).emit("messenger.message", event.message);
  });
  app.addHook("onClose", async () => { unsubscribe(); await io.close(); });
}

function registerNotificationSocket(app: Awaited<ReturnType<typeof createApiApp>>) {
  const io = new SocketServer(app.server, {
    cors: { credentials: true, origin: platformWebOrigins() },
    path: "/api/devkit/notifications/socket.io"
  });
  io.use((socket, next) => {
    const authorization = String(
      socket.handshake.auth.token ?? socket.handshake.headers.authorization ?? ""
    );
    const token = authorization.replace(/^Bearer\s+/iu, "");
    const actor = verifyAuthToken(token);
    if (!actor) return next(new Error("Notification socket authentication failed."));
    socket.data.actorId = actor.userId;
    socket.join(`actor:${actor.userId}`);
    next();
  });
  const unsubscribe = subscribeNotificationEvents((event) => {
    io.to(`actor:${event.actorId}`).emit("notification.created", event);
  });
  app.addHook("onClose", async () => {
    unsubscribe();
    await io.close();
  });
}

function platformWebOrigins() {
  const configuredOrigins = [env.PLATFORM_WEB_ORIGIN, ...env.PLATFORM_WEB_ORIGINS.split(",")];
  if (env.NODE_ENV !== "production") {
    configuredOrigins.push(
      `http://127.0.0.1:${env.PLATFORM_WEB_PORT}`,
      `http://localhost:${env.PLATFORM_WEB_PORT}`,
      "http://127.0.0.1:8081",
      "http://localhost:8081",
      "http://127.0.0.1:1420",
      "http://localhost:1420",
      "http://tauri.localhost",
      "tauri://localhost"
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
  if (request.url.includes("/orchestration/")) return `devkit.orchestration.${action}`;
  if (request.url.includes("/sync/")) return `devkit.sync.${action}`;
  if (request.url.includes("/notifications")) return `devkit.notification.${action}`;
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
