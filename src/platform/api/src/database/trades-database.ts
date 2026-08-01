import { existsSync, writeFileSync } from "node:fs";
import { createConnection } from "mysql2/promise";
import { createPool, type PoolOptions } from "mysql2";
import { Kysely, MysqlDialect, sql } from "kysely";
import {
  migrateDevkitDatabase,
  seedDevkitDatabase
} from "@codexsun/devkit-api";
import type { DevkitDatabase } from "@codexsun/devkit-api";
import { env } from "../env.js";
import { migratePermissionModule } from "../modules/permission/permission.migration.js";
import { seedPermissionModule } from "../modules/permission/permission.seed.js";
import { migrateRoleModule } from "../modules/role/role.migration.js";
import { seedRoleModule } from "../modules/role/role.seed.js";
import { migrateUserModule } from "../modules/user/user.migration.js";
import { seedUserModule } from "../modules/user/user.seed.js";
import { migrateUserRoleModule } from "../modules/user-role/user-role.migration.js";
import { seedUserRoleModule } from "../modules/user-role/user-role.seed.js";
import { migrateRolePermissionModule } from "../modules/role-permission/role-permission.migration.js";
import { seedRolePermissionModule } from "../modules/role-permission/role-permission.seed.js";
import { assertDatabaseName, quoteIdentifier } from "./database-utils.js";
import type { TradesDatabase } from "./schema.js";

let database: Kysely<TradesDatabase> | null = null;
let bootstrapped = false;

export const devkitMigrationOrder = Object.freeze([
  "identity.role",
  "identity.permission",
  "identity.user",
  "identity.user-role",
  "identity.role-permission",
  "devkit.project-manager.sql.v4",
  "devkit.task-manager.sql.v2",
  "devkit.planning.sql.v2",
  "devkit.sync.sql.v1"
]);

export const devkitSeedOrder = Object.freeze([
  "identity.role",
  "identity.permission",
  "identity.user",
  "identity.user-role",
  "identity.role-permission",
  "devkit.project-manager",
  "devkit.task-manager"
]);

export function tradesDatabaseName() {
  return assertDatabaseName(env.DB_NAME, "DevKit database name");
}

export function tradesDatabaseConfig() {
  return {
    database: tradesDatabaseName(),
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    user: env.DB_USER
  };
}

export function getTradesDatabase() {
  if (!database) {
    database = new Kysely<TradesDatabase>({
      dialect: new MysqlDialect({
        pool: createPool({
          ...tradesDatabaseConfig(),
          connectionLimit: 10,
          timezone: "Z"
        } satisfies PoolOptions)
      })
    });
  }
  return database;
}

export async function bootstrapTradesDatabase() {
  if (bootstrapped || process.env.DEVKIT_DEV_SKIP_DB === "1") return;
  if (env.DEVKIT_DB_FRESH_ON_START === "1") {
    const sessionFile = process.env.DEVKIT_DB_FRESH_SESSION_FILE;
    if (!sessionFile || !existsSync(sessionFile)) {
      await resetTradesDatabase();
      if (sessionFile) writeFileSync(sessionFile, new Date().toISOString(), "utf8");
      return;
    }
  }
  await createTradesDatabase();
  await migrateTradesDatabase();
  await seedTradesDatabase();
  bootstrapped = true;
  console.info(`[database] DevKit database ready: "${tradesDatabaseName()}"`);
}

export async function createTradesDatabase() {
  const connection = await createConnection({
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    user: env.DB_USER,
    timezone: "Z"
  });
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(tradesDatabaseName())} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await connection.end();
  }
}

export async function migrateTradesDatabase() {
  const db = getTradesDatabase();
  await sql
    .raw(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(160) NOT NULL UNIQUE,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    )
    .execute(db);
  await migrateRoleModule(db);
  await migratePermissionModule(db);
  await migrateUserModule(db);
  await migrateUserRoleModule(db);
  await migrateRolePermissionModule(db);
  await migrateDevkitDatabase(db as unknown as Kysely<DevkitDatabase>);
}

export async function seedTradesDatabase() {
  const db = getTradesDatabase();
  await seedRoleModule(db);
  await seedPermissionModule(db);
  await seedUserModule(db);
  await seedUserRoleModule(db);
  await seedRolePermissionModule(db);
  await seedDevkitDatabase(db as unknown as Kysely<DevkitDatabase>);
}

export async function closeTradesDatabase() {
  if (database) await database.destroy();
  database = null;
  bootstrapped = false;
}

export async function resetTradesDatabase() {
  assertDestructiveDatabaseAction();
  await closeTradesDatabase();
  const connection = await createConnection({
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    user: env.DB_USER,
    timezone: "Z"
  });
  try {
    await connection.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(tradesDatabaseName())}`);
  } finally {
    await connection.end();
  }
  await createTradesDatabase();
  await migrateTradesDatabase();
  await seedTradesDatabase();
  bootstrapped = true;
}

function assertDestructiveDatabaseAction() {
  if (env.DEVKIT_DB_RESET_CONFIRM !== "DROP_DATABASE") {
    throw new Error(
      "Set DEVKIT_DB_RESET_CONFIRM=DROP_DATABASE to reset the DevKit database."
    );
  }
  if (env.NODE_ENV === "production" && env.DEVKIT_ALLOW_PRODUCTION_DB_RESET !== "1") {
    throw new Error("Production database reset is disabled.");
  }
}
