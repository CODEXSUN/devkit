import { ok } from "@codexsun/framework/http";
import { AppError } from "@codexsun/framework/errors";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireDevkitActor } from "../../request-context.js";
import { MessengerRepository } from "./messenger.repository.js";
import { MessengerService } from "./messenger.service.js";
import { MessengerRateLimiter } from "./messenger-rate-limit.js";
import { publishMessengerEvent, publishMessengerUnreadEvent } from "./messenger.runtime.js";
import { MessengerAttachmentStorage, validateMessengerAttachment } from "./messenger.storage.js";
import { randomBytes } from "node:crypto";

const repository = new MessengerRepository();
const service = new MessengerService(repository);
const rateLimiter = new MessengerRateLimiter();
const id = z.string().trim().length(32);
const actorId = z.string().trim().min(1).max(160);
const conversationInput = z.object({ peerActorId: actorId }).strict();
const conversationParams = z.object({ conversationId: id }).strict();
const historyQuery = z.object({ before: z.string().trim().max(512).optional(), limit: z.coerce.number().int().min(20).max(100).default(50) }).strict();
const sendSchema = z.object({ body: z.string().trim().min(1).max(8_000), client: z.enum(["desktop", "mobile", "web"]) }).strict();
const preferenceSchema = z.object({ archived: z.boolean().optional(), muted: z.boolean().optional() }).strict().refine((input) => input.archived !== undefined || input.muted !== undefined);
const messageParams = conversationParams.extend({ messageId: id });
const attachmentParams = messageParams.extend({ attachmentId: id });
const attachmentHeaders = z.object({ "x-file-name": z.string().min(1), "x-file-type": z.string().min(1) }).passthrough();
const reactionSchema = z.object({ emoji: z.enum(["👍", "❤️", "😂", "😮", "😢", "🙏"]) }).strict();
const attachmentStorage = new MessengerAttachmentStorage();

export function registerMessengerRoutes(app: FastifyInstance) {
  app.get("/messenger/contacts", async (request) =>
    ok(await service.contacts(requireDevkitActor()), { requestId: request.id })
  );
  app.get("/messenger/conversations", async (request) => {
    const actor = requireDevkitActor();
    return ok((await repository.conversations(actor.id)).map(mapConversation), { requestId: request.id });
  });
  app.post("/messenger/conversations", async (request) => {
    const actor = requireDevkitActor();
    rateLimiter.consume(actor.id, "conversation");
    const input = conversationInput.parse(request.body);
    const conversation = await service.openDirectConversation(actor, input.peerActorId);
    await publishUnreadState(await repository.participantIds(actor.id, conversation.uuid), conversation.uuid);
    return ok(mapConversation(conversation), { requestId: request.id });
  });
  app.post("/messenger/device-conversation", async (request) => {
    const actor = requireDevkitActor();
    const conversationId = await repository.conversation(actor.id, actor.id);
    const conversation = (await repository.conversations(actor.id)).find(
      (item) => item.uuid === conversationId
    );
    if (!conversation) throw AppError.notFound("Device conversation was not found.");
    return ok(mapConversation(conversation), { requestId: request.id });
  });
  app.get("/messenger/conversations/:conversationId/messages", async (request) => {
    const actor = requireDevkitActor();
    const { conversationId } = conversationParams.parse(request.params);
    const messages = await repository.list(actor.id, conversationId);
    const details = await repository.messageDetails(actor.id, conversationId, messages.map((message) => message.uuid));
    return ok(messages.map((message) => mapMessage(message, details)), { requestId: request.id });
  });
  app.get("/messenger/conversations/:conversationId/message-history", async (request) => {
    const actor = requireDevkitActor();
    const { conversationId } = conversationParams.parse(request.params);
    const query = historyQuery.parse(request.query);
    const page = await repository.history(actor.id, conversationId, query.limit, query.before);
    const details = await repository.messageDetails(actor.id, conversationId, page.items.map((message) => message.uuid));
    return ok({
      items: page.items.map((message) => mapMessage(message, details)),
      nextCursor: page.nextCursor
    }, { requestId: request.id });
  });
  app.post("/messenger/conversations/:conversationId/messages/:messageId/attachments", async (request) => {
    const actor = requireDevkitActor();
    rateLimiter.consume(actor.id, "attachment");
    const { conversationId, messageId } = messageParams.parse(request.params);
    const headers = attachmentHeaders.parse(request.headers);
    if (!Buffer.isBuffer(request.body)) throw AppError.validation("Attachment request body must be binary.");
    const file = validateMessengerAttachment(request.body, headers["x-file-type"], decodeURIComponent(headers["x-file-name"]));
    const uuid = randomBytes(16).toString("hex");
    const storageKey = `${conversationId}/${uuid}`;
    await attachmentStorage.write(storageKey, request.body);
    let attachment;
    try {
      attachment = mapAttachment(await repository.addAttachment(actor.id, conversationId, messageId, { ...file, sizeBytes: request.body.byteLength, storageKey, uuid }), conversationId);
    } catch (reason) {
      await attachmentStorage.remove(storageKey).catch(() => undefined);
      throw reason;
    }
    await publishUpdatedMessage(actor.id, conversationId, messageId);
    return ok(attachment, { requestId: request.id });
  });
  app.get("/messenger/conversations/:conversationId/messages/:messageId/attachments/:attachmentId", async (request, reply) => {
    const actor = requireDevkitActor();
    const { conversationId, attachmentId } = attachmentParams.parse(request.params);
    const attachment = await repository.attachment(actor.id, conversationId, attachmentId);
    return reply
      .header("cache-control", "private, no-store")
      .header("content-disposition", `attachment; filename*=UTF-8''${encodeURIComponent(attachment.original_name)}`)
      .header("content-security-policy", "sandbox")
      .header("content-type", attachment.mime_type)
      .header("x-content-type-options", "nosniff")
      .send(await attachmentStorage.read(attachment.storage_key));
  });
  app.post("/messenger/conversations/:conversationId/messages/:messageId/reactions", async (request) => {
    const actor = requireDevkitActor();
    rateLimiter.consume(actor.id, "reaction");
    const { conversationId, messageId } = messageParams.parse(request.params);
    const { emoji } = reactionSchema.parse(request.body);
    const reactions = (await repository.toggleReaction(actor.id, conversationId, messageId, emoji)).map((row) => ({ actorId: row.actor_id, emoji: row.emoji, id: row.uuid }));
    await publishUpdatedMessage(actor.id, conversationId, messageId);
    return ok(reactions, { requestId: request.id });
  });
  app.post("/messenger/conversations/:conversationId/messages", async (request) => {
    const actor = requireDevkitActor();
    rateLimiter.consume(actor.id, "message");
    const { conversationId } = conversationParams.parse(request.params);
    const input = sendSchema.parse(request.body);
    const message = mapMessage(await service.send(actor, conversationId, input.body, input.client));
    const actorIds = await repository.participantIds(actor.id, conversationId);
    publishMessengerEvent({ actorIds, message });
    await publishUnreadState(actorIds, conversationId);
    return ok(message, { requestId: request.id });
  });
  app.post("/messenger/conversations/:conversationId/read", async (request) => {
    const actor = requireDevkitActor();
    const { conversationId } = conversationParams.parse(request.params);
    const result = await repository.markRead(actor.id, actor.id, conversationId);
    if (result.changed) {
      await publishReadReceipts(actor.id, conversationId, result.messageIds);
      await publishUnreadState(await repository.participantIds(actor.id, conversationId), conversationId);
    }
    return ok(result, { requestId: request.id });
  });
  app.post("/messenger/conversations/:conversationId/preferences", async (request) => {
    const actor = requireDevkitActor();
    const { conversationId } = conversationParams.parse(request.params);
    const input = preferenceSchema.parse(request.body);
    const result = await repository.preferences(actor.id, actor.id, conversationId, {
      ...(input.archived !== undefined ? { archived: input.archived } : {}),
      ...(input.muted !== undefined ? { muted: input.muted } : {})
    });
    await publishUnreadState([actor.id], conversationId);
    return ok(result, { requestId: request.id });
  });
  app.get("/messenger/conversations/:conversationId/activity", async (request) => {
    const actor = requireDevkitActor();
    const { conversationId } = conversationParams.parse(request.params);
    const activity = await repository.activity(actor.id, conversationId);
    return ok(activity.map((item) => ({
      action: item.action,
      actorId: item.actor_id,
      conversationId: item.conversation_uuid,
      createdAt: new Date(item.created_at).toISOString(),
      details: JSON.parse(item.details_json) as unknown,
      id: item.uuid
    })), { requestId: request.id });
  });
}

function mapConversation(row: Awaited<ReturnType<MessengerRepository["conversations"]>>[number]) {
  return {
    archivedAt: row.archived_at ? new Date(row.archived_at).toISOString() : null,
    id: row.uuid,
    kind: row.kind,
    lastMessageActorId: row.last_message_actor_id,
    lastMessageClient: row.last_message_client,
    lastMessageDeliveredAt: row.last_message_delivered_at ? new Date(row.last_message_delivered_at).toISOString() : null,
    lastMessage: row.last_message ?? "",
    lastMessageReadAt: row.last_message_read_at ? new Date(row.last_message_read_at).toISOString() : null,
    mutedAt: row.muted_at ? new Date(row.muted_at).toISOString() : null,
    peerActorId: row.peer_actor_id,
    title: row.title,
    unreadCount: Number(row.unread_count),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function mapMessage(row: { actor_id: string; body: string; client: string; conversation_uuid: string | null; created_at: Date; delivered_at: Date | null; read_at: Date | null; recipient_actor_id: string | null; uuid: string }, details?: Awaited<ReturnType<MessengerRepository["messageDetails"]>>) {
  const conversationId = row.conversation_uuid ?? "";
  return { actorId: row.actor_id, attachments: details?.attachments.filter((item) => item.message_uuid === row.uuid).map((item) => mapAttachment(item, conversationId)) ?? [], body: row.body, client: row.client as "desktop" | "mobile" | "web", conversationId, createdAt: new Date(row.created_at).toISOString(), deliveredAt: row.delivered_at ? new Date(row.delivered_at).toISOString() : null, reactions: details?.reactions.filter((item) => item.message_uuid === row.uuid).map((item) => ({ actorId: item.actor_id, emoji: item.emoji, id: item.uuid })) ?? [], readAt: row.read_at ? new Date(row.read_at).toISOString() : null, recipientActorId: row.recipient_actor_id, uuid: row.uuid };
}

function mapAttachment(row: { message_uuid?: string; mime_type: string; original_name: string; size_bytes: number; uuid: string }, conversationId: string) {
  return { id: row.uuid, mimeType: row.mime_type, name: row.original_name, size: Number(row.size_bytes), url: `/api/devkit/messenger/conversations/${conversationId}/messages/${row.message_uuid ?? "attachment"}/attachments/${row.uuid}` };
}

async function publishUpdatedMessage(actorId: string, conversationId: string, messageId: string) {
  const [row, details, actorIds] = await Promise.all([
    repository.message(actorId, conversationId, messageId),
    repository.messageDetails(actorId, conversationId, [messageId]),
    repository.participantIds(actorId, conversationId)
  ]);
  publishMessengerEvent({ actorIds, message: mapMessage(row, details) });
}

async function publishReadReceipts(actorId: string, conversationId: string, messageIds: string[]) {
  const [messages, details, actorIds] = await Promise.all([
    repository.messagesById(actorId, conversationId, messageIds),
    repository.messageDetails(actorId, conversationId, messageIds),
    repository.participantIds(actorId, conversationId)
  ]);
  for (const message of messages) publishMessengerEvent({ actorIds, message: mapMessage(message, details) });
}

async function publishUnreadState(actorIds: string[], conversationId: string) {
  await Promise.all(
    [...new Set(actorIds)].map(async (actorId) => {
      const conversations = (await repository.conversations(actorId)).map(mapConversation);
      const conversation = conversations.find((item) => item.id === conversationId);
      if (conversation) {
        publishMessengerUnreadEvent({
          actorId,
          conversation,
          totalUnread: conversations.reduce((total, item) => total + item.unreadCount, 0)
        });
      }
    })
  );
}
