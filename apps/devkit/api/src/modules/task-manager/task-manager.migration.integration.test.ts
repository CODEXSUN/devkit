import { loadEnv } from "@codexsun/framework/env";
import { createConnection, type RowDataPacket } from "mysql2/promise";
import { afterAll, describe, expect, it } from "vitest";
import { z } from "zod";

const env = loadEnv(
  z.object({
    DB_HOST: z.string().default("127.0.0.1"),
    DB_NAME: z.string().min(1),
    DB_PASSWORD: z.string(),
    DB_PORT: z.coerce.number().int().positive(),
    DB_USER: z.string().min(1)
  })
);

const connection = await createConnection({
  database: env.DB_NAME,
  host: env.DB_HOST,
  password: env.DB_PASSWORD,
  port: env.DB_PORT,
  user: env.DB_USER,
  timezone: "Z"
});

afterAll(() => connection.end());

describe("Task Manager visibility migration", () => {
  it("records v4 and creates the required private visibility column", async () => {
    const [migrations] = await connection.query<Array<RowDataPacket & { name: string }>>(
      "SELECT name FROM schema_migrations WHERE name = 'devkit.task-manager.sql.v4'"
    );
    const [columns] = await connection.query<
      Array<RowDataPacket & { COLUMN_DEFAULT: string; IS_NULLABLE: string }>
    >(
      "SELECT IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'devkit_task_manager_todos' AND column_name = 'visibility'"
    );

    expect(migrations).toHaveLength(1);
    expect(columns).toHaveLength(1);
    expect(columns[0]).toMatchObject({ COLUMN_DEFAULT: "'private'", IS_NULLABLE: "NO" });
  });
});
