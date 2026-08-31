import { ok } from "@codexsun/framework/http";
import { AppError } from "@codexsun/framework/errors";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireDevkitActor } from "../../request-context.js";
import { MessengerRepository } from "./messenger.repository.js";
import { publishMessengerEvent } from "./messenger.runtime.js";

const repository = new MessengerRepository();
const id = z.string().trim().length(32);
const actorId = z.string().trim().min(1).max(160);
const conversationInput = z.object({ peerActorId: actorId.optional() }).strict();
const conversationParams = z.object({ conversationId: id }).strict();
const sendSchema = z.object({ body: z.string().trim().min(1).max(8_000), client: z.enum(["desktop", "mobile", "web"]) }).strict();
const preferenceSchema = z.object({ archived: z.boolean().optional(), muted: z.boolean().optional() }).strict().refine((input) => input.archived !== undefined || input.muted !== undefined);

export function registerMessengerRoutes(app: FastifyInstance) {
  app.get("/messenger/conversations", async (request) => {
    const actor = requireDevkitActor();
    return ok((await repository.conversations(actor.id)).map(mapConversation), { requestId: request.id });
  });
  app.post("/messenger/conversations", async (request) => {
    const actor = requireDevkitActor();
    const input = conversationInput.parse(request.body);
    if (input.peerActorId && actor.canMessageActor && !(await actor.canMessageActor(input.peerActorId))) {
      throw AppError.notFound("Messenger recipient is not an active user.");
    }
    const conversationId = await repository.conversation(actor.id, actor.id, input.peerActorId);
    const conversation = (await repository.conversations(actor.id)).find((item) => item.uuid === conversationId)!;
    return ok(mapConversation(conversation), { requestId: request.id });
  });
  app.get("/messenger/conversations/:conversationId/messages", async (request) => {
    const actor = requireDevkitActor();
    const { conversationId } = conversationParams.parse(request.params);
    return ok((await repository.list(actor.id, conversationId)).map(mapMessage), { requestId: request.id });
  });
  app.post("/messenger/conversations/:conversationId/messages", async (request) => {
    const actor = requireDevkitActor();
    const { conversationId } = conversationParams.parse(request.params);
    const input = sendSchema.parse(request.body);
    const message = mapMessage(await repository.create(actor.id, actor.id, conversationId, input.body, input.client));
    const participants = (await repository.conversations(actor.id)).find((item) => item.uuid === conversationId);
    publishMessengerEvent({ actorIds: [...new Set([actor.id, participants?.peer_actor_id].filter((value): value is string => Boolean(value)))], message });
    return ok(message, { requestId: request.id });
  });
  app.post("/messenger/conversations/:conversationId/read", async (request) => {
    const actor = requireDevkitActor();
    const { conversationId } = conversationParams.parse(request.params);
    return ok(await repository.markRead(actor.id, actor.id, conversationId), { requestId: request.id });
  });
  app.post("/messenger/conversations/:conversationId/preferences", async (request) => {
    const actor = requireDevkitActor();
    const { conversationId } = conversationParams.parse(request.params);
    const input = preferenceSchema.parse(request.body);
    return ok(await repository.preferences(actor.id, actor.id, conversationId, {
      ...(input.archived !== undefined ? { archived: input.archived } : {}),
      ...(input.muted !== undefined ? { muted: input.muted } : {})
    }), { requestId: request.id });
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
    lastMessage: row.last_message ?? "",
    mutedAt: row.muted_at ? new Date(row.muted_at).toISOString() : null,
    peerActorId: row.peer_actor_id,
    title: row.title,
    unreadCount: Number(row.unread_count),
    updatedAt: new Date(row.updated_at).toISOString()
  };
}

function mapMessage(row: { actor_id: string; body: string; client: string; conversation_uuid: string | null; created_at: Date; delivered_at: Date | null; read_at: Date | null; recipient_actor_id: string | null; uuid: string }) {
  return { actorId: row.actor_id, body: row.body, client: row.client as "desktop" | "mobile" | "web", conversationId: row.conversation_uuid ?? "", createdAt: new Date(row.created_at).toISOString(), deliveredAt: row.delivered_at ? new Date(row.delivered_at).toISOString() : null, readAt: row.read_at ? new Date(row.read_at).toISOString() : null, recipientActorId: row.recipient_actor_id, uuid: row.uuid };
}
