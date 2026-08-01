import { AsyncLocalStorage } from "node:async_hooks";
import { Kysely, sql } from "kysely";
import {
  migrateProjectManagerModule,
  projectManagerMigration,
} from "../modules/project-manager/project-manager.migration.js";
import { seedProjectManagerModule } from "../modules/project-manager/project-manager.seed.js";
import {
  migrateTaskManagerModule,
  taskManagerMigration,
} from "../modules/task-manager/task-manager.migration.js";
import { seedTaskManagerModule } from "../modules/task-manager/task-manager.seed.js";
import {
  migrateSyncModule,
  syncMigration,
} from "../modules/sync/sync.migration.js";
import type { DevkitDatabase } from "./schema.js";
import {
  migratePlanningModule,
  planningMigration,
} from "../modules/planning/planning.migration.js";

const databaseContext = new AsyncLocalStorage<Kysely<DevkitDatabase>>();
const bootstrapPromises = new WeakMap<
  Kysely<DevkitDatabase>,
  Promise<void>
>();
const requestDatabase = new Proxy({} as Kysely<DevkitDatabase>, {
  get(_target, property) {
    const database = databaseContext.getStore();
    if (!database)
      throw new Error("DevKit requires a CXApp-provided request database.");
    const value = Reflect.get(database, property, database) as unknown;
    return typeof value === "function" ? value.bind(database) : value;
  },
});

const migrationSteps = [
  {
    migrate: migrateProjectManagerModule,
    name: projectManagerMigration.key,
  },
  {
    migrate: migrateTaskManagerModule,
    name: taskManagerMigration.key,
  },
  {
    migrate: migratePlanningModule,
    name: planningMigration.key,
  },
  {
    migrate: migrateSyncModule,
    name: syncMigration.key,
  },
] as const;

const seedSteps = [
  { name: "devkit.project-manager", seed: seedProjectManagerModule },
  { name: "devkit.task-manager", seed: seedTaskManagerModule },
] as const;

export function getDevkitDatabase() {
  return requestDatabase;
}

export function runWithDevkitDatabase<T>(
  database: Kysely<DevkitDatabase>,
  callback: () => T,
) {
  return databaseContext.run(database, callback);
}

export function bootstrapDevkitDatabase(
  database: Kysely<DevkitDatabase>,
) {
  const existing = bootstrapPromises.get(database);
  if (existing) return existing;
  const bootstrap = (async () => {
    await migrateDevkitDatabase(database);
    await seedDevkitDatabase(database);
  })();
  bootstrapPromises.set(database, bootstrap);
  void bootstrap.catch(() => bootstrapPromises.delete(database));
  return bootstrap;
}

export async function migrateDevkitDatabase(db: Kysely<DevkitDatabase>) {
  await db.schema
    .createTable("schema_migrations")
    .ifNotExists()
    .addColumn("id", "integer", (column) => column.primaryKey().autoIncrement())
    .addColumn("package_id", "varchar(160)", (column) =>
      column.notNull().defaultTo("legacy"),
    )
    .addColumn("name", "varchar(160)", (column) => column.notNull().unique())
    .addColumn("applied_at", "datetime", (column) =>
      column.notNull().defaultTo(sql`CURRENT_TIMESTAMP`),
    )
    .execute();
  await sql`
    ALTER TABLE schema_migrations
    ADD COLUMN IF NOT EXISTS package_id VARCHAR(160) NOT NULL DEFAULT 'legacy' AFTER id
  `.execute(db);
  const legacyJournal = await sql<{ count: number | string }>`
    SELECT COUNT(*) AS count
    FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = 'devkit_migrations'
  `.execute(db);
  if (Number(legacyJournal.rows[0]?.count ?? 0) > 0) {
    await sql`
      INSERT IGNORE INTO schema_migrations (package_id, name, applied_at)
      SELECT '@codexsun/devkit', name, applied_at
      FROM devkit_migrations
    `.execute(db);
    await sql`DROP TABLE devkit_migrations`.execute(db);
  }
  await sql`
    UPDATE schema_migrations
    SET package_id = '@codexsun/devkit'
    WHERE package_id = 'legacy' AND name LIKE 'devkit.%'
  `.execute(db);

  for (const step of migrationSteps) {
    await step.migrate(db);
    await db
      .insertInto("schema_migrations")
      .ignore()
      .values({ name: step.name, package_id: "@codexsun/devkit" })
      .execute();
    console.info(`[database] DevKit migration applied: ${step.name}`);
  }
}

export async function seedDevkitDatabase(db: Kysely<DevkitDatabase>) {
  for (const step of seedSteps) {
    const result = await step.seed(db);
    console.info(`[seeder] ${step.name}: ${result.records} records imported`);
  }
}

export const devkitTenantMigrations = migrationSteps;

export const devkitDatabaseLifecycle = Object.freeze({
  migrations: Object.freeze(migrationSteps.map(({ name }) => name)),
  packageId: "@codexsun/devkit",
  seeders: Object.freeze(seedSteps.map(({ name }) => name)),
  async runSql({ database }: { database: unknown }) {
    await bootstrapDevkitDatabase(database as Kysely<DevkitDatabase>);
  },
});
