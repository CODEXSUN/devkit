import { ok } from "@codexsun/framework/http";
import type { FastifyInstance } from "fastify";
import { OrchestrationService } from "./orchestration.service.js";

const service = new OrchestrationService();

export async function registerOrchestrationRoutes(app: FastifyInstance) {
  app.get("/orchestration/catalog", async (request) =>
    ok(service.catalog(), { requestId: request.id })
  );
}
