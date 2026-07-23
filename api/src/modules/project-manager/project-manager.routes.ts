import type { FastifyInstance, FastifyRequest } from "fastify";
import { ok } from "@codexsun/framework/http";
import { z } from "zod";
import { requireDevkitPlatformSession } from "../../auth/platform-auth.guard.js";
import { ProjectManagerService } from "./project-manager.service.js";

const service = new ProjectManagerService();
const kindSchema = z.enum([
  "activity",
  "discussion",
  "issue",
  "kanban",
  "release",
  "review",
  "task",
  "timeline",
  "todo"
]);
const idParamsSchema = z.object({ id: z.string().min(1) }).strict();
const kindParamsSchema = z.object({ kind: kindSchema }).strict();
const itemParamsSchema = z.object({ id: z.string().min(1), kind: kindSchema }).strict();
const itemSaveSchema = z
  .object({
    active: z.boolean().optional(),
    assignee: z.string().optional(),
    description: z.string().optional(),
    dueDate: z.string().optional(),
    key: z.string().min(1),
    lane: z.string().optional(),
    moduleKey: z.string().optional(),
    priority: z.enum(["critical", "high", "low", "medium"]).optional(),
    referenceId: z.string().optional(),
    referenceType: z.string().optional(),
    sortOrder: z.number().optional(),
    status: z.string().optional(),
    title: z.string().min(1),
    type: z.string().optional()
  })
  .strict();
const documentationRowSchema = z
  .object({
    createdAt: z.string(),
    id: z.string(),
    key: z.string(),
    updatedAt: z.string(),
    value: z.string()
  })
  .strict();
const planningNoteSchema = z
  .object({
    body: z.string(),
    createdAt: z.string(),
    id: z.string(),
    title: z.string(),
    updatedAt: z.string()
  })
  .strict();
const registrySaveSchema = z
  .object({
    active: z.boolean().optional(),
    description: z.string().optional(),
    documentation: z.record(z.string(), z.array(documentationRowSchema)).optional(),
    groupId: z.string().optional(),
    key: z.string().min(1),
    moduleType: z.enum(["area", "module", "page"]).optional(),
    name: z.string().min(1),
    parentGroupId: z.string().optional(),
    parentModuleId: z.string().optional(),
    planningNotes: z.array(planningNoteSchema).optional(),
    platformId: z.string().optional(),
    routePath: z.string().optional(),
    sortOrder: z.number().optional(),
    status: z.string().optional()
  })
  .strict();

export async function registerProjectManagerRoutes(app: FastifyInstance) {
  app.get("/admin/project-manager/result", async (request) =>
    ok(await service.result(), { requestId: request.id })
  );
  app.get("/admin/project-manager/registry/result", async (request) =>
    ok(await service.registryResult(), { requestId: request.id })
  );

  app.get("/admin/project-manager/registry/platforms", async (request) =>
    ok(await service.listRegistryPlatforms(), { requestId: request.id })
  );
  app.post("/admin/project-manager/registry/platforms", async (request) =>
    ok(await service.createRegistryPlatform(registrySaveSchema.parse(request.body), actor(request)), {
      requestId: request.id
    })
  );
  app.put("/admin/project-manager/registry/platforms/:id", async (request) =>
    ok(
      await service.updateRegistryPlatform(
        idParamsSchema.parse(request.params).id,
        registrySaveSchema.partial().parse(request.body),
        actor(request)
      ),
      { requestId: request.id }
    )
  );
  app.post("/admin/project-manager/registry/platforms/:id/deactivate", async (request) =>
    ok(
      await service.setRegistryActive(
        "platforms",
        idParamsSchema.parse(request.params).id,
        false,
        actor(request)
      ),
      { requestId: request.id }
    )
  );
  app.post("/admin/project-manager/registry/platforms/:id/restore", async (request) =>
    ok(
      await service.setRegistryActive(
        "platforms",
        idParamsSchema.parse(request.params).id,
        true,
        actor(request)
      ),
      { requestId: request.id }
    )
  );

  app.get("/admin/project-manager/registry/groups", async (request) =>
    ok(await service.listRegistryGroups(), { requestId: request.id })
  );
  app.post("/admin/project-manager/registry/groups", async (request) =>
    ok(await service.createRegistryGroup(registrySaveSchema.parse(request.body), actor(request)), {
      requestId: request.id
    })
  );
  app.put("/admin/project-manager/registry/groups/:id", async (request) =>
    ok(
      await service.updateRegistryGroup(
        idParamsSchema.parse(request.params).id,
        registrySaveSchema.partial().parse(request.body),
        actor(request)
      ),
      { requestId: request.id }
    )
  );
  app.post("/admin/project-manager/registry/groups/:id/deactivate", async (request) =>
    ok(
      await service.setRegistryActive(
        "groups",
        idParamsSchema.parse(request.params).id,
        false,
        actor(request)
      ),
      { requestId: request.id }
    )
  );
  app.post("/admin/project-manager/registry/groups/:id/restore", async (request) =>
    ok(
      await service.setRegistryActive(
        "groups",
        idParamsSchema.parse(request.params).id,
        true,
        actor(request)
      ),
      { requestId: request.id }
    )
  );

  app.get("/admin/project-manager/registry/modules", async (request) =>
    ok(await service.listRegistryModules(), { requestId: request.id })
  );
  app.post("/admin/project-manager/registry/modules", async (request) =>
    ok(await service.createRegistryModule(registrySaveSchema.parse(request.body), actor(request)), {
      requestId: request.id
    })
  );
  app.put("/admin/project-manager/registry/modules/:id", async (request) =>
    ok(
      await service.updateRegistryModule(
        idParamsSchema.parse(request.params).id,
        registrySaveSchema.partial().parse(request.body),
        actor(request)
      ),
      { requestId: request.id }
    )
  );
  app.post("/admin/project-manager/registry/modules/:id/deactivate", async (request) =>
    ok(
      await service.setRegistryActive(
        "modules",
        idParamsSchema.parse(request.params).id,
        false,
        actor(request)
      ),
      { requestId: request.id }
    )
  );
  app.post("/admin/project-manager/registry/modules/:id/restore", async (request) =>
    ok(
      await service.setRegistryActive(
        "modules",
        idParamsSchema.parse(request.params).id,
        true,
        actor(request)
      ),
      { requestId: request.id }
    )
  );

  app.get("/admin/project-manager/:kind", async (request) =>
    ok(await service.list(kindParamsSchema.parse(request.params).kind), {
      requestId: request.id
    })
  );
  app.post("/admin/project-manager/:kind", async (request) =>
    ok(
      await service.create(
        kindParamsSchema.parse(request.params).kind,
        itemSaveSchema.parse(request.body),
        actor(request)
      ),
      { requestId: request.id }
    )
  );
  app.put("/admin/project-manager/:kind/:id", async (request) => {
    const params = itemParamsSchema.parse(request.params);
    return ok(
      await service.update(
        params.kind,
        params.id,
        itemSaveSchema.partial().parse(request.body),
        actor(request)
      ),
      { requestId: request.id }
    );
  });
  app.post("/admin/project-manager/:kind/:id/deactivate", async (request) => {
    const params = itemParamsSchema.parse(request.params);
    return ok(await service.deactivate(params.kind, params.id, actor(request)), {
      requestId: request.id
    });
  });
  app.post("/admin/project-manager/:kind/:id/restore", async (request) => {
    const params = itemParamsSchema.parse(request.params);
    return ok(await service.restore(params.kind, params.id, actor(request)), {
      requestId: request.id
    });
  });
  app.delete("/admin/project-manager/:kind/:id", async (request) => {
    const params = itemParamsSchema.parse(request.params);
    return ok(await service.delete(params.kind, params.id, actor(request)), {
      requestId: request.id
    });
  });
}

function actor(request: FastifyRequest) {
  return (
    requireDevkitPlatformSession(request.headers.authorization).email?.trim() ||
    "unknown@codexsun.local"
  );
}
