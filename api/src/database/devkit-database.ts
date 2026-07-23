import { Kysely, MysqlDialect, sql } from "kysely";
import { createPool, type PoolOptions } from "mysql2";
import { createConnection } from "mysql2/promise";
import { env } from "../env.js";
import {
  migrateProjectManagerModule,
  projectManagerMigration
} from "../modules/project-manager/project-manager.migration.js";
import { seedProjectManagerModule } from "../modules/project-manager/project-manager.seed.js";
import {
  migrateTaskManagerModule,
  taskManagerMigration
} from "../modules/task-manager/task-manager.migration.js";
import { seedTaskManagerModule } from "../modules/task-manager/task-manager.seed.js";
import { assertDatabaseName, quoteIdentifier } from "./database-utils.js";
import type { DevkitDatabase } from "./schema.js";

let database: Kysely<DevkitDatabase> | null = null;
let bootstrapped = false;

const migrationSteps = [
  {
    migrate: migrateProjectManagerModule,
    name: projectManagerMigration.key
  },
  {
    migrate: migrateTaskManagerModule,
    name: taskManagerMigration.key
  }
] as const;

const seedSteps = [
  { name: "devkit.project-manager", seed: seedProjectManagerModule },
  { name: "devkit.task-manager", seed: seedTaskManagerModule }
] as const;

export function devkitDatabaseName() {
  return assertDatabaseName(env.DEVKIT_DB_NAME);
}

export function devkitDatabaseConfig() {
  return {
    database: devkitDatabaseName(),
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    user: env.DB_USER
  };
}

export function getDevkitDatabase() {
  if (!database) {
    database = new Kysely<DevkitDatabase>({
      dialect: new MysqlDialect({
        pool: createPool({
          ...devkitDatabaseConfig(),
          connectionLimit: 10,
          timezone: "Z"
        } satisfies PoolOptions)
      })
    });
  }
  return database;
}

export async function bootstrapDevkitDatabase() {
  if (bootstrapped) return;
  await createDevkitDatabase();
  await migrateDevkitDatabase();
  await seedDevkitDatabase();
  bootstrapped = true;
  console.info(`[database] DevKit database ready: "${devkitDatabaseName()}"`);
}

export async function createDevkitDatabase() {
  const connection = await createConnection({
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    timezone: "Z",
    user: env.DB_USER
  });
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS ${quoteIdentifier(devkitDatabaseName())} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
  } finally {
    await connection.end();
  }
}

export async function migrateDevkitDatabase() {
  const db = getDevkitDatabase();
  await db.schema
    .createTable("devkit_migrations")
    .ifNotExists()
    .addColumn("id", "integer", (column) => column.primaryKey().autoIncrement())
    .addColumn("name", "varchar(160)", (column) => column.notNull().unique())
    .addColumn("applied_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
    )
    .execute();

  for (const step of migrationSteps) {
    await step.migrate(db);
    await db.insertInto("devkit_migrations").ignore().values({ name: step.name }).execute();
    console.info(`[database] DevKit migration applied: ${step.name}`);
  }
}

export async function seedDevkitDatabase() {
  const db = getDevkitDatabase();
  for (const step of seedSteps) {
    const result = await step.seed(db);
    console.info(`[seeder] ${step.name}: ${result.records} records imported`);
  }
}

export async function checkDevkitDatabase() {
  await sql`SELECT 1`.execute(getDevkitDatabase());
  return {
    details: { database: devkitDatabaseName() },
    status: "ok" as const
  };
}

export async function closeDevkitDatabase() {
  if (database) {
    await database.destroy();
    database = null;
  }
  bootstrapped = false;
}
