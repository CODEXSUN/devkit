import type { FastifyInstance } from "fastify";
import { registerContractRoute } from "@codexsun/framework/http";
import {
  devkitLoginInputSchema,
  devkitLoginResultSchema,
  devkitLogoutResultSchema,
  devkitSessionSchema,
} from "./devkit-auth.schemas.js";
import { DevkitAuthService } from "./devkit-auth.service.js";
import { requireDevkitSession } from "./devkit-auth.token.js";

export function registerDevkitAuthRoutes(
  app: FastifyInstance,
  service = new DevkitAuthService(),
) {
  registerContractRoute(app, {
    method: "POST",
    url: "/auth/login",
    schemas: {
      body: devkitLoginInputSchema,
      response: devkitLoginResultSchema,
    },
    handler: ({ body }) => service.login(body),
  });

  registerContractRoute(app, {
    method: "GET",
    url: "/auth/session",
    schemas: { response: devkitSessionSchema },
    handler: ({ request }) => {
      const claims = requireDevkitSession(request.headers.authorization);
      return {
        authenticated: true as const,
        email: claims.email,
        expiresAt: new Date(claims.exp * 1000).toISOString(),
        name: claims.name,
        role: claims.role,
        sessionIssuedAt: claims.sessionIssuedAt,
        userType: claims.userType,
      };
    },
  });

  registerContractRoute(app, {
    method: "POST",
    url: "/auth/logout",
    schemas: { response: devkitLogoutResultSchema },
    handler: () => ({ loggedOut: true as const }),
  });
}
