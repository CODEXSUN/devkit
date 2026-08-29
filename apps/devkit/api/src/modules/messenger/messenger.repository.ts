import { randomBytes } from "node:crypto";
import { getDevkitDatabase } from "../../database/devkit-database.js";

export class MessengerRepository {
  private readonly database = getDevkitDatabase();

  list(actorId: string) {
    return this.database.selectFrom("devkit_messenger_messages").selectAll()
      .where("actor_id", "=", actorId).orderBy("created_at", "asc").limit(300).execute();
  }

  async create(actorId: string, body: string, client: string) {
    const uuid = randomBytes(16).toString("hex");
    await this.database.insertInto("devkit_messenger_messages")
      .values({ actor_id: actorId, body, client, uuid }).executeTakeFirstOrThrow();
    return this.database.selectFrom("devkit_messenger_messages").selectAll()
      .where("uuid", "=", uuid).executeTakeFirstOrThrow();
  }
}
