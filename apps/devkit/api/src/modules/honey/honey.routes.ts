import { ok } from "@codexsun/framework/http";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireDevkitActor } from "../../request-context.js";
import { HoneyService } from "./honey.service.js";

const service = new HoneyService();
const chatSchema = z.object({ message: z.string().trim().min(1).max(4000), threadId: z.string().length(16).nullable().optional() }).strict();
const memoryReviewSchema = z.object({ status: z.enum(["approved", "rejected"]) }).strict();

export async function registerHoneyRoutes(app: FastifyInstance) {
  app.get("/honey/conversations", async (request) => ok(await service.conversations(requireDevkitActor().id), { requestId: request.id }));
  app.get("/honey/conversations/:uuid", async (request) => {
    const { uuid } = z.object({ uuid: z.string().length(16) }).parse(request.params);
    return ok(await service.conversation(uuid, requireDevkitActor().id), { requestId: request.id });
  });
  app.post("/honey/chat", async (request) => ok(await service.chat(chatSchema.parse(request.body), requireDevkitActor().id), { requestId: request.id }));
  app.get("/honey/memory", async (request) => ok(await service.memory(requireDevkitActor().id), { requestId: request.id }));
  app.put("/honey/memory/:uuid", async (request) => {
    const { uuid } = z.object({ uuid: z.string().length(16) }).parse(request.params);
    const { status } = memoryReviewSchema.parse(request.body);
    return ok(await service.reviewMemory(uuid, status, requireDevkitActor().id), { requestId: request.id });
  });
}
