import { loadEnv } from "@codexsun/framework/env";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { z } from "zod";

const defaultStoragePath = resolve(
  process.env.LOCALAPPDATA || process.env.APPDATA || homedir(),
  "CODEXSUN",
  "Devkit",
  "storage",
);
const defaultDevelopmentPassword = "ChangeDevkit!123";
const defaultDevelopmentJwtSecret =
  "codexsun-devkit-local-jwt-secret-change-before-production";

const schema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "staging", "production"])
      .default("development"),
    DEVKIT_API_PORT: z.coerce.number().int().positive().default(7030),
    DEVKIT_WEB_PORT: z.coerce.number().int().positive().default(7040),
    DEVKIT_WEB_ORIGIN: z.string().url().default("http://127.0.0.1:7040"),
    DEVKIT_COOKIE_SECRET: z
      .string()
      .min(16)
      .default("codexsun-devkit-local-secret"),
    DB_HOST: z.string().min(1).default("127.0.0.1"),
    DB_PASSWORD: z.string().default(""),
    DB_PORT: z.coerce.number().int().positive().default(3306),
    DB_USER: z.string().min(1).default("root"),
    DEVKIT_DB_NAME: z
      .string()
      .regex(/^[a-zA-Z0-9_]+$/u)
      .default("devkit_db"),
    DEVKIT_STORAGE_PATH: z.string().min(1).default(defaultStoragePath),
    DEVKIT_ADMIN_EMAIL: z.string().email().default("developer@codexsun.local"),
    DEVKIT_ADMIN_NAME: z.string().min(1).default("CODEXSUN Developer"),
    DEVKIT_ADMIN_PASSWORD: z
      .string()
      .min(8)
      .default(defaultDevelopmentPassword),
    DEVKIT_JWT_SECRET: z.string().min(32).default(defaultDevelopmentJwtSecret),
    DEVKIT_SESSION_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(28_800),
  })
  .superRefine((value, context) => {
    if (
      value.NODE_ENV === "production" &&
      value.DEVKIT_ADMIN_PASSWORD === defaultDevelopmentPassword
    ) {
      context.addIssue({
        code: "custom",
        message: "DEVKIT_ADMIN_PASSWORD must be changed in production.",
        path: ["DEVKIT_ADMIN_PASSWORD"],
      });
    }
    if (
      value.NODE_ENV === "production" &&
      value.DEVKIT_JWT_SECRET === defaultDevelopmentJwtSecret
    ) {
      context.addIssue({
        code: "custom",
        message: "DEVKIT_JWT_SECRET must be changed in production.",
        path: ["DEVKIT_JWT_SECRET"],
      });
    }
  });

export const env = loadEnv(schema);
