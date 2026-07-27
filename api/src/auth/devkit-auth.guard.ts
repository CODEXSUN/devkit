import type { FastifyInstance } from "fastify";
import { requireDevkitSession } from "./devkit-auth.token.js";

const publicPaths = new Set([
  "/",
  "/health",
  "/auth/login",
  "/auth/logout",
  "/auth/session",
]);

export function registerDevkitAuthGuard(app: FastifyInstance) {
  app.addHook("preHandler", async (request) => {
    const path = request.url.split("?", 1)[0];
    if (path && publicPaths.has(path)) return;
    requireDevkitSession(request.headers.authorization);
  });
}

export { requireDevkitSession } from "./devkit-auth.token.js";
