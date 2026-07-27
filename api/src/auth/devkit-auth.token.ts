import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { AppError } from "@codexsun/framework/errors";
import { env } from "../env.js";
import type { DevkitUserRole } from "./devkit-auth.schemas.js";

type DevkitAccessClaims = {
  aud: "codexsun-devkit";
  email: string;
  exp: number;
  iat: number;
  iss: "codexsun-devkit-api";
  jti: string;
  name: string;
  role: DevkitUserRole;
  sessionIssuedAt: string;
  userId: string;
  userType: "developer";
};

export function signDevkitToken(input: {
  email: string;
  name: string;
  role: DevkitUserRole;
  userId: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  const claims: DevkitAccessClaims = {
    aud: "codexsun-devkit",
    email: input.email,
    exp: now + env.DEVKIT_SESSION_TTL_SECONDS,
    iat: now,
    iss: "codexsun-devkit-api",
    jti: randomUUID(),
    name: input.name,
    role: input.role,
    sessionIssuedAt: new Date(now * 1000).toISOString(),
    userId: input.userId,
    userType: "developer",
  };
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode(claims);
  const signature = createHmac("sha256", env.DEVKIT_JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${signature}`;
}

export function requireDevkitSession(
  authorization: string | string[] | undefined,
): DevkitAccessClaims {
  const selected = Array.isArray(authorization)
    ? authorization[0]
    : authorization;
  const token = selected?.match(/^Bearer\s+(.+)$/iu)?.[1];
  if (!token) throw AppError.unauthorized("DevKit authentication is required.");

  const claims = verify(token);
  if (!claims)
    throw AppError.unauthorized("DevKit session is invalid or expired.");
  return claims;
}

function verify(token: string): DevkitAccessClaims | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts as [string, string, string];
  const expected = createHmac("sha256", env.DEVKIT_JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest("base64url");
  if (!safeEqual(signature, expected)) return null;

  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as DevkitAccessClaims;
    if (
      claims.iss !== "codexsun-devkit-api" ||
      claims.aud !== "codexsun-devkit" ||
      claims.userType !== "developer" ||
      claims.role !== "developer_admin" ||
      typeof claims.exp !== "number" ||
      claims.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return claims;
  } catch {
    return null;
  }
}

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}
