import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const databaseFile = "src/platform/api/src/database/trades-database.ts";
const devkitDatabaseFile = "src/devkit/api/src/database/devkit-database.ts";
const schemaFile = "src/platform/api/src/database/schema.ts";
const database = readFileSync(resolve(root, databaseFile), "utf8");
const devkitDatabase = readFileSync(resolve(root, devkitDatabaseFile), "utf8");
const schema = readFileSync(resolve(root, schemaFile), "utf8");

assertOrdered(databaseFile, database, [
  "migrateRoleModule(db)",
  "migratePermissionModule(db)",
  "migrateUserModule(db)",
  "migrateUserRoleModule(db)",
  "migrateRolePermissionModule(db)",
  "migrateDevkitDatabase(db as unknown as Kysely<DevkitDatabase>)"
]);
assertOrdered(databaseFile, database, [
  "seedRoleModule(db)",
  "seedPermissionModule(db)",
  "seedUserModule(db)",
  "seedUserRoleModule(db)",
  "seedRolePermissionModule(db)",
  "seedDevkitDatabase(db as unknown as Kysely<DevkitDatabase>)"
]);

assertOrdered(devkitDatabaseFile, devkitDatabase, [
  "migrate: migrateProjectManagerModule",
  "migrate: migrateTaskManagerModule",
  "migrate: migratePlanningModule",
  "migrate: migrateSyncModule"
]);
assertOrdered(devkitDatabaseFile, devkitDatabase, [
  'name: "devkit.project-manager", seed: seedProjectManagerModule',
  'name: "devkit.task-manager", seed: seedTaskManagerModule'
]);

const expectedTables = [
  "permissions",
  "role_permissions",
  "roles",
  "schema_migrations",
  "user_roles",
  "users"
];
const declaredTables = Array.from(
  schema.matchAll(/^  ([a-z_]+): [A-Za-z]+Table;$/gmu),
  (match) => match[1]
).sort();
if (declaredTables.join(",") !== expectedTables.join(",")) {
  throw new Error(`${schemaFile}: unexpected table ownership: ${declaredTables.join(", ")}`);
}
if (!database.includes("tradesDatabaseName()")) {
  throw new Error(`${databaseFile}: single database selection is missing`);
}

console.info("Database lifecycle verified: Platform identity followed by DevKit-owned modules.");

function assertOrdered(file, source, tokens) {
  let previous = -1;
  for (const token of tokens) {
    const index = source.indexOf(token, previous + 1);
    if (index < 0) throw new Error(`${file}: missing ${token}`);
    if (index <= previous) throw new Error(`${file}: out of order ${token}`);
    previous = index;
  }
}
