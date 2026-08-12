import { ok } from "@codexsun/framework/http";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireDevkitActor } from "../../request-context.js";
import { HoneyService } from "./honey.service.js";

const service = new HoneyService();
const pageContextSchema = z
  .object({
    pageLabel: z.string().trim().max(160),
    pathname: z.string().trim().max(500),
    projectId: z.string().trim().max(160).nullable(),
    projectTitle: z.string().trim().max(240).nullable(),
    recentError: z.string().trim().max(1000).nullable(),
    runStatus: z.string().trim().max(80).nullable(),
    taskId: z.string().trim().max(160).nullable()
  })
  .strict();
const chatSchema = z
  .object({
    context: pageContextSchema,
    message: z.string().trim().min(1).max(4000),
    threadId: z.string().length(16).nullable().optional()
  })
  .strict();
const memoryReviewSchema = z
  .object({
    note: z.string().trim().max(500).default(""),
    status: z.enum(["approved", "rejected", "reverted"])
  })
  .strict();

export async function registerHoneyRoutes(app: FastifyInstance) {
  app.get("/honey/conversations", async (request) =>
    ok(await service.conversations(requireDevkitActor().id), { requestId: request.id })
  );
  app.get("/honey/conversations/:uuid", async (request) => {
    const { uuid } = z.object({ uuid: z.string().length(16) }).parse(request.params);
    return ok(await service.conversation(uuid, requireDevkitActor().id), { requestId: request.id });
  });
  app.put("/honey/conversations/:uuid/archive", async (request) => {
    const { uuid } = z.object({ uuid: z.string().length(16) }).parse(request.params);
    return ok(await service.archiveConversation(uuid, requireDevkitActor().id), {
      requestId: request.id
    });
  });
  app.post("/honey/chat", async (request) =>
    ok(await service.chat(chatSchema.parse(request.body), requireDevkitActor().id), {
      requestId: request.id
    })
  );
  app.get("/honey/memory", async (request) =>
    ok(await service.memory(requireDevkitActor().id), { requestId: request.id })
  );
  app.get("/honey/dashboard", async (request) =>
    ok(await service.dashboard(requireDevkitActor().id), { requestId: request.id })
  );
  app.put("/honey/memory/:uuid", async (request) => {
    const { uuid } = z.object({ uuid: z.string().length(16) }).parse(request.params);
    const { note, status } = memoryReviewSchema.parse(request.body);
    return ok(await service.reviewMemory(uuid, status, note, requireDevkitActor().id), {
      requestId: request.id
    });
  });
}
