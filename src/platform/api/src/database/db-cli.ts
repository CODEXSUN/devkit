import { createConnection } from "mysql2/promise";
import { env } from "../env.js";
import {
  closeTradesDatabase,
  createTradesDatabase,
  migrateTradesDatabase,
  resetTradesDatabase,
  seedTradesDatabase,
  tradesDatabaseName
} from "./trades-database.js";

type DbCommand = "migrate" | "seed" | "drop" | "fresh" | "migrations:list";
const validCommands: DbCommand[] = ["migrate", "seed", "drop", "fresh", "migrations:list"];
const command = process.argv[2] as DbCommand | undefined;

async function main() {
  if (!command || !validCommands.includes(command)) {
    console.info("Usage: tsx src/database/db-cli.ts migrate|seed|drop|fresh|migrations:list");
    process.exitCode = 1;
    return;
  }

  try {
    if (command === "migrate") {
      await createTradesDatabase();
      await migrateTradesDatabase();
    } else if (command === "seed") {
      await createTradesDatabase();
      await migrateTradesDatabase();
      await seedTradesDatabase();
    } else if (command === "drop" || command === "fresh") {
      await resetTradesDatabase();
    } else {
      await listMigrations();
    }
    console.info(`[database] db:${command} completed for "${tradesDatabaseName()}"`);
  } finally {
    await closeTradesDatabase();
  }
}

async function listMigrations() {
  const connection = await createConnection({
    database: tradesDatabaseName(),
    host: env.DB_HOST,
    password: env.DB_PASSWORD,
    port: env.DB_PORT,
    user: env.DB_USER,
    timezone: "Z"
  });
  try {
    const [rows] = await connection.query(
      "SELECT name, applied_at FROM schema_migrations ORDER BY applied_at, id"
    );
    console.table(rows);
  } finally {
    await connection.end();
  }
}

await main();
