#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const modules = ["project-manager", "task-manager"];
const backendRoles = [
  "events",
  "migration",
  "module",
  "repository",
  "routes",
  "seed",
  "service",
  "sync",
  "types",
  "worker",
];
const frontendRoles = [
  "form",
  "hooks",
  "list",
  "schema",
  "services",
  "types",
  "workspace",
];
const failures = [];

for (const moduleName of modules) {
  const apiRoot = join(root, "src/api/src/modules", moduleName);
  const webRoot = join(root, "src/web/src/modules", moduleName);
  for (const role of backendRoles) {
    requireFile(join(apiRoot, `${moduleName}.${role}.ts`));
  }
  for (const role of frontendRoles) {
    const extension = ["form", "list", "workspace"].includes(role)
      ? "tsx"
      : "ts";
    requireFile(join(webRoot, `${moduleName}.${role}.${extension}`));
  }

  const repository = readFile(join(apiRoot, `${moduleName}.repository.ts`));
  const migration = readFile(join(apiRoot, `${moduleName}.migration.ts`));
  const routes = readFile(join(apiRoot, `${moduleName}.routes.ts`));
  const seed = readFile(join(apiRoot, `${moduleName}.seed.ts`));
  const service = readFile(join(apiRoot, `${moduleName}.service.ts`));

  reject(
    repository,
    /node:fs|JSON_DIR|JsonStore/u,
    `${moduleName} repository uses file storage`,
  );
  reject(
    service,
    /JsonStore|\.store\.js/u,
    `${moduleName} service uses file storage`,
  );
  reject(
    routes,
    /\brequest\.(body|params|query)\s+as\b/u,
    `${moduleName} routes cast requests`,
  );
  requireMatch(
    migration,
    /CREATE TABLE IF NOT EXISTS/u,
    `${moduleName} migration has no table`,
  );
  reject(
    migration,
    /CREATE TABLE IF NOT EXISTS\s+(?!devkit_)/u,
    `${moduleName} migration creates an unprefixed table`,
  );
  for (const [source, owner] of [
    [repository, "repository"],
    [seed, "seed"],
  ]) {
    reject(
      source,
      /\.(?:selectFrom|insertInto|updateTable|deleteFrom)\(\s*["'](?!devkit_|schema_migrations)/u,
      `${moduleName} ${owner} queries an unprefixed table`,
    );
  }
  requireMatch(
    repository,
    /\.(selectFrom|insertInto|updateTable|deleteFrom)\(/u,
    `${moduleName} repository has no concrete SQL behavior`,
  );

  for (const obsolete of [
    `${moduleName}.store.ts`,
    `${moduleName}.lookup-store.ts`,
  ]) {
    if (existsSync(join(apiRoot, obsolete))) {
      failures.push(`${moduleName}: obsolete file store remains: ${obsolete}`);
    }
  }
}

if (failures.length) {
  console.error("DevKit module boundary check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(
  "DevKit module boundaries verified: module-owned SQL migrations/repositories and unchanged frontend role ownership.",
);

function requireFile(path) {
  if (!existsSync(path)) failures.push(`missing required role: ${path}`);
}

function readFile(path) {
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

function reject(source, pattern, message) {
  if (pattern.test(source)) failures.push(message);
}

function requireMatch(source, pattern, message) {
  if (!pattern.test(source)) failures.push(message);
}
