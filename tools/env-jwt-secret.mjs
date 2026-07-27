#!/usr/bin/env node

import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const envPath = resolve(root, ".env");

if (!existsSync(envPath)) {
  console.error(".env file not found at", envPath);
  process.exit(1);
}

const secret = randomBytes(32).toString("hex");
const content = readFileSync(envPath, "utf8");
const hasJwtSecret = /^DEVKIT_JWT_SECRET=/mu.test(content);

const updated = hasJwtSecret
  ? content.replace(/^DEVKIT_JWT_SECRET=.*$/mu, `DEVKIT_JWT_SECRET=${secret}`)
  : content.endsWith("\n")
    ? `${content}DEVKIT_JWT_SECRET=${secret}\n`
    : `${content}\nDEVKIT_JWT_SECRET=${secret}\n`;

writeFileSync(envPath, updated);
console.log("DEVKIT_JWT_SECRET generated and written to .env");
console.log(`  ${secret}`);
