import { ok } from "@codexsun/framework/http";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireDevkitActor } from "../../request-context.js";
import { DevkitSyncService } from "./sync.service.js";

const service = new DevkitSyncService();
const tokenSchema = z.string().regex(/^[A-Za-z0-9]{16}$/u);
const snapshotSchema = z
  .object({
    attachmentData: z.record(z.string(), z.string()),
    instanceId: z.string().min(2).max(80),
    protocolVersion: z.literal(1),
    publishedAt: z.string().datetime(),
    tables: z.record(z.string(), z.array(z.record(z.string(), z.unknown()))),
  })
  .strict();

export async function registerSyncRoutes(app: FastifyInstance) {
  app.get("/admin/sync/status", async (request) =>
    ok(await service.status(), { requestId: request.id }),
  );
  app.post("/admin/sync/cloud/tokens", async (request) => {
    const body = z
      .object({ label: z.string().min(1).max(160) })
      .strict()
      .parse(request.body);
    return ok(await service.generateCloudToken(body.label, actor(request)), {
      requestId: request.id,
    });
  });
  app.post("/admin/sync/bind", async (request) => {
    const body = z
      .object({ instanceId: z.string().min(2).max(80), token: tokenSchema })
      .strict()
      .parse(request.body);
    return ok(await service.bind(body.token, body.instanceId), {
      requestId: request.id,
    });
  });
  app.post("/admin/sync/publish", async (request) =>
    ok(await service.publish(), { requestId: request.id }),
  );
  app.post("/admin/sync/pull", async (request) =>
    ok(await service.pull(), { requestId: request.id }),
  );

  app.get("/sync/cloud/v1/status", async (request) =>
    ok(await service.cloudStatus(syncToken(request)), {
      requestId: request.id,
    }),
  );
  app.get("/sync/cloud/v1/snapshot", async (request) =>
    ok(await service.cloudSnapshot(syncToken(request)), {
      requestId: request.id,
    }),
  );
  app.post(
    "/sync/cloud/v1/snapshot",
    { bodyLimit: 64 * 1024 * 1024 },
    async (request) => {
      const body = z
        .object({
          baseRevision: z.number().int().nonnegative(),
          snapshot: snapshotSchema,
        })
        .strict()
        .parse(request.body);
      return ok(
        await service.cloudPublish(
          syncToken(request),
          body.baseRevision,
          body.snapshot,
        ),
        { requestId: request.id },
      );
    },
  );
}

function syncToken(request: FastifyRequest) {
  return tokenSchema.parse(request.headers["x-devkit-sync-token"]);
}

function actor(request: FastifyRequest) {
  return (
    requireDevkitActor().email?.trim() || requireDevkitActor().id || request.id
  );
}
