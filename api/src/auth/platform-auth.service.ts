import { AppError } from "@codexsun/framework/errors";
import { z } from "zod";
import { env } from "../env.js";
import {
  platformLoginResultSchema,
  platformLogoutResultSchema,
  type PlatformLoginInput,
  type PlatformLoginResult,
} from "./platform-auth.schemas.js";

const platformErrorSchema = z.object({
  code: z.string().optional(),
  message: z.string(),
});

export class PlatformAuthService {
  async login(input: PlatformLoginInput): Promise<PlatformLoginResult> {
    const result = await this.request(
      "/auth/login",
      platformLoginResultSchema,
      {
        body: JSON.stringify({ ...input, desk: "sa" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      },
    );
    if (result.userType !== "super_admin") {
      throw AppError.forbidden(
        "This Platform account cannot access the Devkit developer desk.",
      );
    }
    return result;
  }

  logout(authorization: string | undefined) {
    return this.request("/auth/logout", platformLogoutResultSchema, {
      headers: authorization ? { Authorization: authorization } : {},
      method: "POST",
    });
  }

  private async request<T>(
    path: string,
    dataSchema: z.ZodType<T>,
    options: RequestInit,
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(
        `${env.PLATFORM_API_URL.replace(/\/$/u, "")}${path}`,
        {
          ...options,
          signal: AbortSignal.timeout(5_000),
        },
      );
    } catch {
      throw new AppError({
        code: "PLATFORM_AUTH_UNAVAILABLE",
        message: "Platform authentication is currently unavailable.",
        statusCode: 503,
      });
    }

    const payload = await parseJson(response);
    if (!response.ok || payload.success !== true) {
      const error = platformErrorSchema.safeParse(payload.error);
      throw new AppError({
        code: error.success
          ? error.data.code || "PLATFORM_AUTH_FAILED"
          : "PLATFORM_AUTH_FAILED",
        message: error.success
          ? error.data.message
          : "Platform authentication failed.",
        statusCode: response.status || 502,
      });
    }

    const data = dataSchema.safeParse(payload.data);
    if (!data.success) {
      throw new AppError({
        code: "PLATFORM_AUTH_INVALID_RESPONSE",
        message: "Platform authentication returned an invalid response.",
        statusCode: 502,
      });
    }
    return data.data;
  }
}

async function parseJson(response: Response): Promise<Record<string, unknown>> {
  let payload: unknown;
  try {
    payload = (await response.json()) as unknown;
  } catch {
    throw invalidPlatformResponse();
  }
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  throw invalidPlatformResponse();
}

function invalidPlatformResponse() {
  return new AppError({
    code: "PLATFORM_AUTH_INVALID_RESPONSE",
    message: "Platform authentication returned an invalid response.",
    statusCode: 502,
  });
}
