import { randomBytes } from "node:crypto";
import { AppError } from "@codexsun/framework/errors";
import { getDevkitDatabase } from "../../database/devkit-database.js";

class HoneyRepository {
  async list(actorId: string) {
    return getDevkitDatabase().selectFrom("devkit_honey_threads").selectAll()
      .where("actor_id", "=", actorId).orderBy("updated_at", "desc").execute();
  }

  async find(threadUuid: string, actorId: string) {
    const thread = await getDevkitDatabase().selectFrom("devkit_honey_threads").selectAll()
      .where("uuid", "=", threadUuid).where("actor_id", "=", actorId).executeTakeFirst();
    if (!thread) throw AppError.notFound("Honey conversation was not found.");
    return thread;
  }

  async create(actorId: string, firstMessage: string) {
    const uuid = randomBytes(8).toString("hex");
    await getDevkitDatabase().insertInto("devkit_honey_threads").values({
      actor_id: actorId, codex_thread_id: null, status: "active",
      title: firstMessage.slice(0, 80), uuid
    }).executeTakeFirstOrThrow();
    return this.find(uuid, actorId);
  }

  async messages(threadUuid: string, actorId: string) {
    await this.find(threadUuid, actorId);
    return getDevkitDatabase().selectFrom("devkit_honey_messages").selectAll()
      .where("thread_uuid", "=", threadUuid).where("actor_id", "=", actorId)
      .orderBy("created_at", "asc").execute();
  }

  async addMessage(threadUuid: string, actorId: string, role: "assistant" | "user", body: string, context: unknown = {}) {
    await getDevkitDatabase().insertInto("devkit_honey_messages").values({
      actor_id: actorId, body, context_json: JSON.stringify(context), role, thread_uuid: threadUuid,
      uuid: randomBytes(8).toString("hex")
    }).executeTakeFirstOrThrow();
    await getDevkitDatabase().updateTable("devkit_honey_threads").set({ updated_at: new Date() })
      .where("uuid", "=", threadUuid).where("actor_id", "=", actorId).execute();
  }

  async setCodexThread(threadUuid: string, actorId: string, codexThreadId: string) {
    await getDevkitDatabase().updateTable("devkit_honey_threads")
      .set({ codex_thread_id: codexThreadId, updated_at: new Date() })
      .where("uuid", "=", threadUuid).where("actor_id", "=", actorId).execute();
  }

  async approvedMemory(actorId: string) {
    return getDevkitDatabase().selectFrom("devkit_honey_memory").select(["kind", "content"])
      .where("actor_id", "=", actorId).where("status", "=", "approved")
      .orderBy("updated_at", "desc").limit(20).execute();
  }

  async memory(actorId: string) {
    return getDevkitDatabase().selectFrom("devkit_honey_memory").selectAll()
      .where("actor_id", "=", actorId).orderBy("updated_at", "desc").limit(100).execute();
  }

  async reviewMemory(actorId: string, uuid: string, status: "approved" | "rejected" | "reverted", note = "") {
    const result = await getDevkitDatabase().updateTable("devkit_honey_memory")
      .set({ review_note: note, status, updated_at: new Date() }).where("actor_id", "=", actorId)
      .where("uuid", "=", uuid).executeTakeFirst();
    if (Number(result.numUpdatedRows) === 0) throw AppError.notFound("Honey memory was not found.");
  }

  async rememberCandidate(actorId: string, threadUuid: string, content: string) {
    if (content.length < 20 || !/\b(?:remember|prefer|always|business|customer|workflow|automation)\b/iu.test(content)) return;
    const existing = await getDevkitDatabase().selectFrom("devkit_honey_memory").select("uuid")
      .where("actor_id", "=", actorId).where("content", "=", content).executeTakeFirst();
    if (existing) return;
    await getDevkitDatabase().insertInto("devkit_honey_memory").values({
      actor_id: actorId, content, kind: "conversation-candidate", source_thread_uuid: threadUuid,
      review_note: "", source_label: `Honey conversation ${threadUuid}`, status: "pending",
      supersedes_uuid: null, uuid: randomBytes(8).toString("hex"), version: 1
    }).executeTakeFirstOrThrow();
  }
}

export const honeyRepository = new HoneyRepository();
