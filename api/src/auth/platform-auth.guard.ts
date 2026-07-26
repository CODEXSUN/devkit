import type { FastifyInstance } from "fastify";
import {
  requirePlatformAccess,
  type PlatformAccessClaims,
} from "@codexsun/framework/api";
import { env } from "../env.js";

const allowedUserTypes = ["super_admin"] as const;
const publicPaths = new Set([
  "/",
  "/health",
  "/auth/platform/login",
  "/auth/platform/logout",
  "/auth/platform/session",
]);

export function requireDevkitPlatformSession(
  authorization: string | string[] | undefined,
): PlatformAccessClaims {
  return requirePlatformAccess({
    allowedUserTypes,
    authorization,
    secret: env.JWT_SECRET,
  });
}

export function registerDevkitAuthGuard(app: FastifyInstance) {
  app.addHook("preHandler", async (request) => {
    const path = request.url.split("?", 1)[0];
    if (path && publicPaths.has(path)) return;
    requireDevkitPlatformSession(request.headers.authorization);
  });
}
