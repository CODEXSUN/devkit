import { ok } from "@codexsun/framework/http";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireDevkitActor } from "../../request-context.js";
import { MessengerRepository } from "./messenger.repository.js";
import { publishMessengerEvent } from "./messenger.runtime.js";

const repository = new MessengerRepository();
const sendSchema = z.object({ body: z.string().trim().min(1).max(8_000), client: z.enum(["desktop", "mobile", "web"]) }).strict();

export function registerMessengerRoutes(app: FastifyInstance) {
  app.get("/messenger/messages", async (request) => {
    const actor = requireDevkitActor();
    return ok((await repository.list(actor.id)).map(mapMessage), { requestId: request.id });
  });
  app.post("/messenger/messages", async (request) => {
    const actor = requireDevkitActor();
    const input = sendSchema.parse(request.body);
    const message = mapMessage(await repository.create(actor.id, input.body, input.client));
    publishMessengerEvent({ actorId: actor.id, message });
    return ok(message, { requestId: request.id });
  });
}

function mapMessage(row: { actor_id: string; body: string; client: string; created_at: Date; uuid: string }) {
  return { actorId: row.actor_id, body: row.body, client: row.client as "desktop" | "mobile" | "web", createdAt: new Date(row.created_at).toISOString(), uuid: row.uuid };
}
