#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const command = process.argv[2];
if (!["migrate", "seed"].includes(command)) {
  console.error("Usage: node tools/database.mjs <migrate|seed>");
  process.exit(1);
}

const devkitEnv = loadDotEnv(resolve(root, ".env"));
const platformEnv = loadDotEnv(resolve(root, "../codexsun/.env"));
const fallback = Object.fromEntries(
  ["DB_HOST", "DB_PASSWORD", "DB_PORT", "DB_USER"]
    .filter((key) => platformEnv[key] !== undefined)
    .map((key) => [key, platformEnv[key]]),
);

execFileSync(
  process.execPath,
  [
    resolve(root, "node_modules/tsx/dist/cli.mjs"),
    "api/src/database/db-cli.ts",
    command,
  ],
  {
    cwd: root,
    env: { ...fallback, ...devkitEnv, ...process.env },
    stdio: "inherit",
  },
);

function loadDotEnv(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/u)
      .map((line) => line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/u))
      .filter(Boolean)
      .map((match) => [match[1].trim(), parseEnvValue(match[2])]),
  );
}

function parseEnvValue(value) {
  const trimmed = String(value ?? "").trim();
  const quote = trimmed[0];
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1);
  }
  return trimmed.replace(/\s+#.*$/u, "").trim();
}
