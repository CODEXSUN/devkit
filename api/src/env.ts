import { loadEnv } from "@codexsun/framework/env";
import { z } from "zod";

const schema = z.object({
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
  JWT_SECRET: z.string().min(32),
  PLATFORM_API_URL: z.string().url().default("http://127.0.0.1:7010"),
});

export const env = loadEnv(schema);
