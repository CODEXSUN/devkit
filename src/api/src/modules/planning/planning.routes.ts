import { ok } from "@codexsun/framework/http";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireDevkitActor } from "../../request-context.js";
import { PlanningRepository } from "./planning.repository.js";

const repository = new PlanningRepository();
const uuid = z.string().regex(/^[a-f0-9]{8}$/u);
const scene = z
  .object({
    appState: z.record(z.string(), z.unknown()).optional(),
    elements: z.array(z.unknown()),
    files: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();
const input = z
  .object({
    description: z.string().max(4000).default(""),
    projectUuid: uuid.nullable().default(null),
    title: z.string().trim().min(1).max(240),
  })
  .strict();

export async function registerPlanningRoutes(app: FastifyInstance) {
  app.get("/planning/boards", async (request) => {
    const query = z
      .object({ projectUuid: uuid.optional() })
      .parse(request.query);
    return ok(await repository.list(query.projectUuid), {
      requestId: request.id,
    });
  });
  app.get("/planning/boards/:uuid", async (request) =>
    ok(await repository.find(z.object({ uuid }).parse(request.params).uuid), {
      requestId: request.id,
    }),
  );
  app.post("/planning/boards", async (request) =>
    ok(await repository.create(input.parse(request.body), actor()), {
      requestId: request.id,
    }),
  );
  app.put(
    "/planning/boards/:uuid",
    { bodyLimit: 16 * 1024 * 1024 },
    async (request) =>
      ok(
        await repository.update(
          z.object({ uuid }).parse(request.params).uuid,
          input
            .partial()
            .extend({ scene: scene.optional() })
            .parse(request.body),
          actor(),
        ),
        { requestId: request.id },
      ),
  );
  app.delete("/planning/boards/:uuid", async (request) =>
    ok(
      await repository.delete(
        z.object({ uuid }).parse(request.params).uuid,
        actor(),
      ),
      { requestId: request.id },
    ),
  );
}

function actor() {
  const value = requireDevkitActor();
  return value.email?.trim() || value.id;
}
