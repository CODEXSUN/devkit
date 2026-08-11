import { ok } from "@codexsun/framework/http";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { GithubDashboardService } from "./github-dashboard.service.js";

const service = new GithubDashboardService();

export async function registerGithubDashboardRoutes(app: FastifyInstance) {
  app.get("/github-dashboard/projects", async (request) =>
    ok(service.dashboard(), { requestId: request.id }),
  );
  app.get("/github-dashboard/projects/:projectName", async (request) => {
    const { projectName } = z
      .object({ projectName: z.string().regex(/^[a-zA-Z0-9._-]+$/u) })
      .strict()
      .parse(request.params);
    return ok(service.project(projectName), { requestId: request.id });
  });
}
