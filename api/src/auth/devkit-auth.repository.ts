import type { Kysely, Selectable } from "kysely";
import { getDevkitDatabase } from "../database/devkit-database.js";
import type { DevkitDatabase, DevkitUsersTable } from "../database/schema.js";

export type DevkitUserRecord = Selectable<DevkitUsersTable>;

export class DevkitAuthRepository {
  constructor(
    private readonly database: Kysely<DevkitDatabase> = getDevkitDatabase(),
  ) {}

  findByEmail(email: string) {
    return this.database
      .selectFrom("devkit_users")
      .selectAll()
      .where("email", "=", email)
      .executeTakeFirst();
  }

  async recordLogin(uuid: string) {
    await this.database
      .updateTable("devkit_users")
      .set({ last_login_at: new Date() })
      .where("uuid", "=", uuid)
      .executeTakeFirst();
  }
}
