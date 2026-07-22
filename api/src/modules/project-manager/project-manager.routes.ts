import type { FastifyInstance } from "fastify";
import { ok } from "@codexsun/framework/http";
import { ProjectManagerService } from "./project-manager.service.js";
import type {
  ProjectManagerKind,
  ProjectManagerRegistrySavePayload,
  ProjectManagerSavePayload
} from "./project-manager.types.js";

const service = new ProjectManagerService();

export async function registerProjectManagerRoutes(app: FastifyInstance) {
  app.get("/admin/project-manager/result", async (request) =>
    ok(await service.result(), { requestId: request.id })
  );
  app.get(
    "/admin/project-manager/registry/result",
    async (request) => ok(await service.registryResult(), { requestId: request.id })
  );
  app.get(
    "/admin/project-manager/registry/platforms",
    async (request) => ok(await service.listRegistryPlatforms(), { requestId: request.id })
  );
  app.post(
    "/admin/project-manager/registry/platforms",
    async (request) =>
      ok(await service.createRegistryPlatform(request.body as ProjectManagerRegistrySavePayload), {
        requestId: request.id
      })
  );
  app.put(
    "/admin/project-manager/registry/platforms/:id",
    async (request) =>
      ok(
        await service.updateRegistryPlatform(
          idParam(request.params),
          request.body as Partial<ProjectManagerRegistrySavePayload>
        ),
        { requestId: request.id }
      )
  );
  app.post(
    "/admin/project-manager/registry/platforms/:id/deactivate",
    async (request) =>
      ok(await service.setRegistryActive("platforms", idParam(request.params), false), {
        requestId: request.id
      })
  );
  app.post(
    "/admin/project-manager/registry/platforms/:id/restore",
    async (request) =>
      ok(await service.setRegistryActive("platforms", idParam(request.params), true), {
        requestId: request.id
      })
  );
  app.get(
    "/admin/project-manager/registry/groups",
    async (request) => ok(await service.listRegistryGroups(), { requestId: request.id })
  );
  app.post(
    "/admin/project-manager/registry/groups",
    async (request) =>
      ok(await service.createRegistryGroup(request.body as ProjectManagerRegistrySavePayload), {
        requestId: request.id
      })
  );
  app.put(
    "/admin/project-manager/registry/groups/:id",
    async (request) =>
      ok(
        await service.updateRegistryGroup(
          idParam(request.params),
          request.body as Partial<ProjectManagerRegistrySavePayload>
        ),
        { requestId: request.id }
      )
  );
  app.post(
    "/admin/project-manager/registry/groups/:id/deactivate",
    async (request) =>
      ok(await service.setRegistryActive("groups", idParam(request.params), false), {
        requestId: request.id
      })
  );
  app.post(
    "/admin/project-manager/registry/groups/:id/restore",
    async (request) =>
      ok(await service.setRegistryActive("groups", idParam(request.params), true), {
        requestId: request.id
      })
  );
  app.get(
    "/admin/project-manager/registry/modules",
    async (request) => ok(await service.listRegistryModules(), { requestId: request.id })
  );
  app.post(
    "/admin/project-manager/registry/modules",
    async (request) =>
      ok(await service.createRegistryModule(request.body as ProjectManagerRegistrySavePayload), {
        requestId: request.id
      })
  );
  app.put(
    "/admin/project-manager/registry/modules/:id",
    async (request) =>
      ok(
        await service.updateRegistryModule(
          idParam(request.params),
          request.body as Partial<ProjectManagerRegistrySavePayload>
        ),
        { requestId: request.id }
      )
  );
  app.post(
    "/admin/project-manager/registry/modules/:id/deactivate",
    async (request) =>
      ok(await service.setRegistryActive("modules", idParam(request.params), false), {
        requestId: request.id
      })
  );
  app.post(
    "/admin/project-manager/registry/modules/:id/restore",
    async (request) =>
      ok(await service.setRegistryActive("modules", idParam(request.params), true), {
        requestId: request.id
      })
  );
  app.get("/admin/project-manager/:kind", async (request) =>
    ok(await service.list(kindParam(request.params)), { requestId: request.id })
  );
  app.post("/admin/project-manager/:kind", async (request) =>
    ok(await service.create(kindParam(request.params), request.body as ProjectManagerSavePayload), {
      requestId: request.id
    })
  );
  app.put("/admin/project-manager/:kind/:id", async (request) =>
    ok(
      await service.update(
        kindParam(request.params),
        idParam(request.params),
        request.body as Partial<ProjectManagerSavePayload>
      ),
      { requestId: request.id }
    )
  );
  app.post(
    "/admin/project-manager/:kind/:id/deactivate",
    async (request) =>
      ok(await service.deactivate(kindParam(request.params), idParam(request.params)), {
        requestId: request.id
      })
  );
  app.post(
    "/admin/project-manager/:kind/:id/restore",
    async (request) =>
      ok(await service.restore(kindParam(request.params), idParam(request.params)), {
        requestId: request.id
      })
  );
  app.delete(
    "/admin/project-manager/:kind/:id",
    async (request) =>
      ok(await service.delete(kindParam(request.params), idParam(request.params)), {
        requestId: request.id
      })
  );
}

function kindParam(params: unknown) {
  return String((params as { kind: string }).kind) as ProjectManagerKind;
}

function idParam(params: unknown) {
  return String((params as { id: string }).id);
}
