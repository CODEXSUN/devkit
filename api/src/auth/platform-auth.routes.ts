import type { FastifyInstance } from "fastify";
import { registerContractRoute } from "@codexsun/framework/http";
import {
  platformLoginInputSchema,
  platformLoginResultSchema,
  platformLogoutResultSchema,
  platformSessionSchema,
} from "./platform-auth.schemas.js";
import { requireDevkitPlatformSession } from "./platform-auth.guard.js";
import { PlatformAuthService } from "./platform-auth.service.js";

export function registerPlatformAuthRoutes(
  app: FastifyInstance,
  service = new PlatformAuthService(),
) {
  registerContractRoute(app, {
    method: "POST",
    url: "/auth/platform/login",
    schemas: {
      body: platformLoginInputSchema,
      response: platformLoginResultSchema,
    },
    handler: ({ body }) => service.login(body),
  });

  registerContractRoute(app, {
    method: "GET",
    url: "/auth/platform/session",
    schemas: { response: platformSessionSchema },
    handler: ({ request }) => {
      const claims = requireDevkitPlatformSession(
        request.headers.authorization,
      );
      return {
        authenticated: true as const,
        email: claims.email || "",
        expiresAt: new Date(Number(claims.exp) * 1000).toISOString(),
        ...(claims.name ? { name: claims.name } : {}),
        ...(claims.sessionIssuedAt
          ? { sessionIssuedAt: claims.sessionIssuedAt }
          : {}),
        userType: claims.userType as "super_admin" | "staff",
      };
    },
  });

  registerContractRoute(app, {
    method: "POST",
    url: "/auth/platform/logout",
    schemas: { response: platformLogoutResultSchema },
    handler: ({ request }) => {
      requireDevkitPlatformSession(request.headers.authorization);
      return service.logout(request.headers.authorization);
    },
  });
}
