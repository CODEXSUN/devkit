import { randomBytes } from "node:crypto";
import type { Kysely } from "kysely";
import type { DevkitDatabase } from "../database/schema.js";
import { env } from "../env.js";
import { hashPassword } from "./password-hash.js";

export async function seedDevkitAuthModule(database: Kysely<DevkitDatabase>) {
  const email = env.DEVKIT_ADMIN_EMAIL.trim().toLowerCase();
  const existing = await database
    .selectFrom("devkit_users")
    .select("uuid")
    .where("email", "=", email)
    .executeTakeFirst();
  const passwordHash = await hashPassword(env.DEVKIT_ADMIN_PASSWORD);
  if (existing) {
    await database
      .updateTable("devkit_users")
      .set({
        name: env.DEVKIT_ADMIN_NAME.trim(),
        password_hash: passwordHash,
        role: "developer_admin",
        status: "active",
      })
      .where("uuid", "=", existing.uuid)
      .executeTakeFirst();
    return { records: 1 };
  }

  await database
    .insertInto("devkit_users")
    .values({
      email,
      name: env.DEVKIT_ADMIN_NAME.trim(),
      password_hash: passwordHash,
      role: "developer_admin",
      status: "active",
      uuid: randomBytes(4).toString("hex"),
    })
    .executeTakeFirstOrThrow();
  return { records: 1 };
}
