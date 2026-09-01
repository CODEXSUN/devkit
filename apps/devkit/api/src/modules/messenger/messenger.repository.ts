import { createHash, randomBytes } from "node:crypto";
import { AppError } from "@codexsun/framework/errors";
import { sql, type Kysely } from "kysely";
import { getDevkitDatabase } from "../../database/devkit-database.js";
import type { DevkitDatabase } from "../../database/schema.js";

type ConversationRow = {
  archived_at: Date | null;
  kind: "device" | "direct";
  last_message_actor_id: string | null;
  last_message_client: "desktop" | "mobile" | "web" | null;
  last_message_delivered_at: Date | null;
  last_message: string | null;
  last_message_read_at: Date | null;
  muted_at: Date | null;
  peer_actor_id: string | null;
  title: string;
  unread_count: number | string;
  updated_at: Date;
  uuid: string;
};

export class MessengerRepository {
  private readonly database = getDevkitDatabase();

  async conversations(actorId: string) {
    await this.ensureDeviceConversation(actorId);
    const result = await sql<ConversationRow>`SELECT conversation.uuid,conversation.kind,
      conversation.title,conversation.updated_at,participant.muted_at,participant.archived_at,
      latest.body last_message,latest.actor_id last_message_actor_id,
      latest.client last_message_client,latest.delivered_at last_message_delivered_at,
      latest.read_at last_message_read_at,
      (SELECT other.actor_id FROM devkit_messenger_participants other
        WHERE other.conversation_uuid=conversation.uuid AND other.actor_id<>${actorId} LIMIT 1) peer_actor_id,
      (SELECT COUNT(*) FROM devkit_messenger_messages unread
        WHERE unread.conversation_uuid=conversation.uuid AND unread.actor_id<>${actorId}
        AND (participant.last_read_at IS NULL OR unread.created_at>participant.last_read_at)) unread_count
      FROM devkit_messenger_conversations conversation
      INNER JOIN devkit_messenger_participants participant
        ON participant.conversation_uuid=conversation.uuid AND participant.actor_id=${actorId}
      LEFT JOIN devkit_messenger_messages latest ON latest.uuid=(
        SELECT message.uuid FROM devkit_messenger_messages message
        WHERE message.conversation_uuid=conversation.uuid
        ORDER BY message.created_at DESC,message.uuid DESC LIMIT 1)
      ORDER BY conversation.updated_at DESC`.execute(this.database);
    return result.rows;
  }

  async conversation(actorId: string, activityActorId: string, peerActorId?: string) {
    return peerActorId ? this.ensureDirectConversation(actorId, activityActorId, peerActorId) : this.ensureDeviceConversation(actorId, activityActorId);
  }

  async list(actorId: string, conversationId: string) {
    await this.requireParticipant(actorId, conversationId);
    await this.database.updateTable("devkit_messenger_messages").set({ delivered_at: new Date() })
      .where("conversation_uuid", "=", conversationId).where("actor_id", "!=", actorId)
      .where("delivered_at", "is", null).execute();
    const messages = await this.database.selectFrom("devkit_messenger_messages").selectAll()
      .where("conversation_uuid", "=", conversationId)
      .orderBy("created_at", "desc").orderBy("uuid", "desc").limit(300).execute();
    return messages.reverse();
  }

  async messageDetails(actorId: string, conversationId: string, messageIds: string[]) {
    await this.requireParticipant(actorId, conversationId);
    if (!messageIds.length) return { attachments: [], reactions: [] };
    const [attachments, reactions] = await Promise.all([
      this.database.selectFrom("devkit_messenger_attachments").selectAll().where("message_uuid", "in", messageIds).execute(),
      this.database.selectFrom("devkit_messenger_reactions").selectAll().where("message_uuid", "in", messageIds).execute()
    ]);
    return { attachments, reactions };
  }

  async message(actorId: string, conversationId: string, messageId: string) {
    await this.requireParticipant(actorId, conversationId);
    return this.database.selectFrom("devkit_messenger_messages").selectAll().where("uuid", "=", messageId).where("conversation_uuid", "=", conversationId).executeTakeFirstOrThrow();
  }

  async messagesById(actorId: string, conversationId: string, messageIds: string[]) {
    await this.requireParticipant(actorId, conversationId);
    return this.database.selectFrom("devkit_messenger_messages").selectAll()
      .where("conversation_uuid", "=", conversationId).where("uuid", "in", messageIds).execute();
  }

  async participantIds(actorId: string, conversationId: string) {
    await this.requireParticipant(actorId, conversationId);
    return (await this.database.selectFrom("devkit_messenger_participants").select("actor_id").where("conversation_uuid", "=", conversationId).execute()).map((row) => row.actor_id);
  }

  async addAttachment(actorId: string, conversationId: string, messageId: string, input: { checksum: string; mimeType: string; originalName: string; sizeBytes: number; storageKey: string; uuid: string }) {
    await this.requireOwnedMessage(actorId, conversationId, messageId);
    await this.database.insertInto("devkit_messenger_attachments").values({
      checksum: input.checksum, message_uuid: messageId, mime_type: input.mimeType,
      original_name: input.originalName, size_bytes: input.sizeBytes, storage_key: input.storageKey, uuid: input.uuid
    }).executeTakeFirstOrThrow();
    return this.database.selectFrom("devkit_messenger_attachments").selectAll().where("uuid", "=", input.uuid).executeTakeFirstOrThrow();
  }

  async attachment(actorId: string, conversationId: string, attachmentId: string) {
    await this.requireParticipant(actorId, conversationId);
    const result = await this.database.selectFrom("devkit_messenger_attachments").innerJoin("devkit_messenger_messages", "devkit_messenger_messages.uuid", "devkit_messenger_attachments.message_uuid")
      .select(["devkit_messenger_attachments.uuid", "storage_key", "original_name", "mime_type", "size_bytes"])
      .where("devkit_messenger_attachments.uuid", "=", attachmentId).where("devkit_messenger_messages.conversation_uuid", "=", conversationId).executeTakeFirst();
    if (!result) throw AppError.notFound("Messenger attachment was not found.");
    return result;
  }

  async toggleReaction(actorId: string, conversationId: string, messageId: string, emoji: string) {
    await this.requireParticipant(actorId, conversationId);
    const message = await this.database.selectFrom("devkit_messenger_messages").select("uuid").where("uuid", "=", messageId).where("conversation_uuid", "=", conversationId).executeTakeFirst();
    if (!message) throw AppError.notFound("Messenger message was not found.");
    const existing = await this.database.selectFrom("devkit_messenger_reactions").select("uuid").where("message_uuid", "=", messageId).where("actor_id", "=", actorId).where("emoji", "=", emoji).executeTakeFirst();
    if (existing) await this.database.deleteFrom("devkit_messenger_reactions").where("uuid", "=", existing.uuid).execute();
    else await this.database.insertInto("devkit_messenger_reactions").values({ actor_id: actorId, emoji, message_uuid: messageId, uuid: randomBytes(16).toString("hex") }).execute();
    return this.database.selectFrom("devkit_messenger_reactions").selectAll().where("message_uuid", "=", messageId).execute();
  }

  async create(actorId: string, activityActorId: string, conversationId: string, body: string, client: string) {
    await this.requireParticipant(actorId, conversationId);
    const uuid = randomBytes(16).toString("hex");
    await this.database.transaction().execute(async (transaction) => {
      await transaction.insertInto("devkit_messenger_messages")
        .values({ actor_id: actorId, body, client, conversation_uuid: conversationId, recipient_actor_id: null, uuid })
        .executeTakeFirstOrThrow();
      await transaction.updateTable("devkit_messenger_conversations")
        .set({ updated_at: new Date() }).where("uuid", "=", conversationId).executeTakeFirstOrThrow();
      await transaction.updateTable("devkit_messenger_participants").set({ last_read_at: new Date() })
        .where("conversation_uuid", "=", conversationId).where("actor_id", "=", actorId).executeTakeFirstOrThrow();
      await writeActivity(transaction, activityActorId, "message-sent", conversationId, { client, messageUuid: uuid });
    });
    return this.database.selectFrom("devkit_messenger_messages").selectAll()
      .where("uuid", "=", uuid).executeTakeFirstOrThrow();
  }

  async markRead(actorId: string, activityActorId: string, conversationId: string) {
    await this.requireParticipant(actorId, conversationId);
    const unread = await sql<{ uuid: string }>`SELECT message.uuid
      FROM devkit_messenger_messages message
      INNER JOIN devkit_messenger_participants participant
        ON participant.conversation_uuid=message.conversation_uuid AND participant.actor_id=${actorId}
      WHERE message.conversation_uuid=${conversationId} AND message.actor_id<>${actorId}
        AND (participant.last_read_at IS NULL OR message.created_at>participant.last_read_at)`.execute(this.database);
    const messageIds = unread.rows.map((message) => message.uuid);
    if (!messageIds.length) return { changed: false, conversationId, messageIds, read: true };
    await this.database.transaction().execute(async (transaction) => {
      await transaction.updateTable("devkit_messenger_participants").set({ last_read_at: new Date() })
        .where("conversation_uuid", "=", conversationId).where("actor_id", "=", actorId).executeTakeFirstOrThrow();
      await writeActivity(transaction, activityActorId, "messages-read", conversationId, {});
      await transaction.updateTable("devkit_messenger_messages").set({ delivered_at: new Date(), read_at: new Date() })
        .where("conversation_uuid", "=", conversationId).where("actor_id", "!=", actorId)
        .where("read_at", "is", null).execute();
    });
    return { changed: true, conversationId, messageIds, read: true };
  }

  async preferences(actorId: string, activityActorId: string, conversationId: string, input: { archived?: boolean; muted?: boolean }) {
    await this.requireParticipant(actorId, conversationId);
    await this.database.transaction().execute(async (transaction) => {
      await transaction.updateTable("devkit_messenger_participants").set({
        ...(input.archived !== undefined ? { archived_at: input.archived ? new Date() : null } : {}),
        ...(input.muted !== undefined ? { muted_at: input.muted ? new Date() : null } : {})
      }).where("conversation_uuid", "=", conversationId).where("actor_id", "=", actorId).executeTakeFirstOrThrow();
      await writeActivity(transaction, activityActorId, "preferences-updated", conversationId, input);
    });
    return { archived: input.archived, conversationId, muted: input.muted };
  }

  async activity(actorId: string, conversationId: string) {
    await this.requireParticipant(actorId, conversationId);
    return this.database.selectFrom("devkit_messenger_activity").selectAll()
      .where("conversation_uuid", "=", conversationId).orderBy("created_at", "desc").limit(100).execute();
  }

  private async ensureDeviceConversation(actorId: string, activityActorId = actorId) {
    const uuid = conversationId("device", [actorId]);
    const created = await this.insertConversation(uuid, "device", "My Devices", actorId);
    await this.insertParticipant(uuid, actorId);
    await this.database.updateTable("devkit_messenger_messages").set({ conversation_uuid: uuid })
      .where("actor_id", "=", actorId).where("recipient_actor_id", "is", null)
      .where("conversation_uuid", "is", null).execute();
    await this.refreshConversationTime(uuid);
    if (created) await writeActivity(this.database, activityActorId, "conversation-created", uuid, { kind: "device" });
    return uuid;
  }

  private async ensureDirectConversation(actorId: string, activityActorId: string, peerActorId: string) {
    if (actorId === peerActorId) return this.ensureDeviceConversation(actorId, activityActorId);
    const uuid = conversationId("direct", [actorId, peerActorId]);
    const created = await this.insertConversation(uuid, "direct", "", actorId);
    await Promise.all([this.insertParticipant(uuid, actorId), this.insertParticipant(uuid, peerActorId)]);
    await sql`UPDATE devkit_messenger_messages SET conversation_uuid=${uuid}
      WHERE conversation_uuid IS NULL AND ((actor_id=${actorId} AND recipient_actor_id=${peerActorId})
      OR (actor_id=${peerActorId} AND recipient_actor_id=${actorId}))`.execute(this.database);
    await this.refreshConversationTime(uuid);
    if (created) await writeActivity(this.database, activityActorId, "conversation-created", uuid, { kind: "direct", peerActorId });
    return uuid;
  }

  private async insertConversation(uuid: string, kind: string, title: string, actorId: string) {
    const result = await sql`INSERT IGNORE INTO devkit_messenger_conversations
      (uuid,kind,title,created_by_actor_id) VALUES (${uuid},${kind},${title},${actorId})`.execute(this.database);
    return Number(result.numAffectedRows ?? 0) > 0;
  }

  private insertParticipant(conversationUuid: string, actorId: string) {
    return sql`INSERT IGNORE INTO devkit_messenger_participants
      (conversation_uuid,actor_id) VALUES (${conversationUuid},${actorId})`.execute(this.database);
  }

  private async requireParticipant(actorId: string, conversationId: string) {
    const participant = await this.database.selectFrom("devkit_messenger_participants").select("id")
      .where("conversation_uuid", "=", conversationId).where("actor_id", "=", actorId).executeTakeFirst();
    if (!participant) throw AppError.forbidden("Messenger conversation is not available to this user.");
  }

  private async requireOwnedMessage(actorId: string, conversationId: string, messageId: string) {
    await this.requireParticipant(actorId, conversationId);
    const message = await this.database.selectFrom("devkit_messenger_messages").select("uuid")
      .where("uuid", "=", messageId).where("conversation_uuid", "=", conversationId).where("actor_id", "=", actorId).executeTakeFirst();
    if (!message) throw AppError.forbidden("Attachments can only be added to your own message.");
  }

  private async refreshConversationTime(conversationId: string) {
    await sql`UPDATE devkit_messenger_conversations conversation SET updated_at=COALESCE(
      (SELECT MAX(message.created_at) FROM devkit_messenger_messages message
        WHERE message.conversation_uuid=${conversationId}),conversation.updated_at)
      WHERE conversation.uuid=${conversationId}`.execute(this.database);
  }
}

function conversationId(kind: string, actorIds: string[]) {
  return createHash("sha256").update(`${kind}:${[...actorIds].sort().join(":")}`).digest("hex").slice(0, 32);
}

function writeActivity(database: Kysely<DevkitDatabase>, actorId: string, action: string, conversationUuid: string, details: unknown) {
  return database.insertInto("devkit_messenger_activity").values({
    action,
    actor_id: actorId,
    conversation_uuid: conversationUuid,
    details_json: JSON.stringify(details),
    uuid: randomBytes(16).toString("hex")
  }).executeTakeFirstOrThrow();
}
