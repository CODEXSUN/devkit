import {
  bootSelectedCxApp,
  createBearerAuthProvider,
  createScopedDatabaseProvider,
  createSingleClientScopeProvider,
  createTrustedActor,
  defineCxStack,
  type CxAppModule,
} from "@codexsun/cxapp";
import type { CxSingleClientScope } from "@codexsun/cxapp";
import type { Kysely } from "kysely";
import {
  registerDevkitAuthRoutes,
  requireDevkitSession,
} from "./auth/index.js";
import {
  bootstrapDevkitDatabase,
  checkDevkitDatabase,
  closeDevkitDatabase,
  devkitDatabaseName,
  getDevkitDatabase,
  type DevkitDatabase,
} from "./database/index.js";
import { env } from "./env.js";
import { projectManagerModule } from "./modules/project-manager/index.js";
import { taskManagerModule } from "./modules/task-manager/index.js";

type DevkitConnection = Kysely<DevkitDatabase>;

const devkitAuthProvider = createBearerAuthProvider({
  isPublic: (request) => {
    const path = request.url.split("?", 1)[0];
    return (
      path === "/auth/login" ||
      path === "/auth/logout" ||
      path === "/auth/session"
    );
  },
  key: "devkit.auth.local",
  register: ({ app }) => registerDevkitAuthRoutes(app),
  verify: (token) => {
    const claims = requireDevkitSession(`Bearer ${token}`);
    return {
      actor: createTrustedActor({
        attributes: {
          email: claims.email,
          role: claims.role,
        },
        displayName: claims.name,
        id: claims.userId,
        permissions: ["devkit.*"],
        type: claims.userType,
      }),
      claims: {
        email: claims.email,
        role: claims.role,
        sessionIssuedAt: claims.sessionIssuedAt,
      },
    };
  },
});

const devkitDatabaseProvider = createScopedDatabaseProvider<
  DevkitConnection,
  CxSingleClientScope
>({
  check: checkDevkitDatabase,
  close: () => closeDevkitDatabase(),
  connect: () => getDevkitDatabase(),
  key: "devkit.database.fixed",
  start: bootstrapDevkitDatabase,
});

const devkitModules: readonly CxAppModule<
  DevkitConnection,
  CxSingleClientScope
>[] = [
  {
    key: projectManagerModule.key,
    register: ({ app }) => projectManagerModule.register({ app }),
  },
  {
    key: taskManagerModule.key,
    register: ({ app }) => taskManagerModule.register({ app }),
  },
];

export const devkitStack = defineCxStack({
  auth: devkitAuthProvider,
  database: devkitDatabaseProvider,
  deployment: {
    imageTag: process.env.CXAPP_IMAGE_TAG ?? "local",
    revision: process.env.CXAPP_REVISION ?? "unknown",
  },
  displayName: "CODEXSUN Devkit API",
  id: "devkit",
  modules: devkitModules,
  scope: createSingleClientScopeProvider({
    clientId: "codexsun-development",
    databaseName: devkitDatabaseName(),
    key: "devkit.scope.fixed-client",
  }),
  server: {
    cookieSecret: env.DEVKIT_COOKIE_SECRET,
    corsOrigins: localOriginAliases(env.DEVKIT_WEB_ORIGIN),
    environment: env.NODE_ENV,
    host: env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1",
    port: env.DEVKIT_API_PORT,
  },
  version: "1.0.47",
});

export function createDevkitRuntime() {
  return bootSelectedCxApp({
    catalog: { devkit: devkitStack },
    environment: {
      ...process.env,
      CXAPP_SCOPE_MODE: process.env.CXAPP_SCOPE_MODE ?? "single-client",
      CXAPP_STACK: process.env.CXAPP_STACK ?? "devkit",
    },
  });
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
