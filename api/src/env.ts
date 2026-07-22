import { loadEnv } from "@codexsun/framework/env";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  DEVKIT_API_PORT: z.coerce.number().int().positive().default(7030),
  DEVKIT_WEB_PORT: z.coerce.number().int().positive().default(7040),
  DEVKIT_WEB_ORIGIN: z.string().url().default("http://127.0.0.1:7040"),
  DEVKIT_COOKIE_SECRET: z.string().min(16).default("codexsun-devkit-local-secret")
});

export const env = loadEnv(schema);
