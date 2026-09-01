import { createHash, timingSafeEqual } from "node:crypto";
import { AppError } from "@codexsun/framework/errors";
import { ok } from "@codexsun/framework/http";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireDevkitActor } from "../../request-context.js";
import { skillsRepository as repository } from "./skills.repository.js";

const nameSchema = z.object({ name: z.string().min(1).max(64) }).strict();

export async function registerSkillsRoutes(app: FastifyInstance) {
  app.get("/skills", async (request) => ok(await repository.list(), { requestId: request.id }));
  app.post("/skills", async (request) => {
    assertSkillWritesAllowed(request.headers);
    const input = z.object({ description: z.string().min(10).max(500), name: z.string().min(1).max(64) }).strict().parse(request.body);
    return ok(await repository.create(input), { requestId: request.id });
  });
  app.post("/skills/:name/files", async (request) => {
    assertSkillWritesAllowed(request.headers);
    const { name } = nameSchema.parse(request.params);
    const input = z.object({ content: z.string().max(1_000_000), file: z.string().min(1).max(500) }).strict().parse(request.body);
    return ok(await repository.createReference(name, input.file, input.content), { requestId: request.id });
  });
  app.get("/skills/:name/files/*", async (request) => {
    const { name } = nameSchema.parse(request.params);
    const file = wildcard(request.params);
    return ok({ content: await repository.read(name, file), file }, { requestId: request.id });
  });
  app.put("/skills/:name/files/*", async (request) => {
    assertSkillWritesAllowed(request.headers);
    const { name } = nameSchema.parse(request.params);
    const { content } = z.object({ content: z.string().max(1_000_000) }).strict().parse(request.body);
    return ok(await repository.save(name, wildcard(request.params), content), { requestId: request.id });
  });
  app.put("/skills/:name/usage", async (request) => {
    assertSkillWritesAllowed(request.headers);
    const { name } = nameSchema.parse(request.params);
    const usage = z.object({ prompting: z.boolean(), review: z.boolean() }).strict().parse(request.body);
    return ok(await repository.setUsage(name, usage), { requestId: request.id });
  });
  app.get("/skills/:name/download", async (request, reply) => {
    const { name } = nameSchema.parse(request.params);
    reply.header("content-disposition", `attachment; filename="${name}.skill.json"`);
    return reply.send(await repository.export(name));
  });
}

function assertSkillWritesAllowed(headers: Record<string, string | string[] | undefined>) {
  if (process.env.DEVKIT_SYNC_ROLE?.trim().toLowerCase() !== "cloud") return;

  const actor = requireDevkitActor();
  if (!actor.roles.includes("super-admin")) {
    throw AppError.forbidden("Cloud skills are read-only. Contact a Super Administrator.");
  }

  const reason = header(headers, "x-devkit-emergency-reason");
  const key = header(headers, "x-devkit-super-admin-key");
  if (!reason || reason.length < 12 || reason.length > 500) {
    throw AppError.validation("An emergency reason between 12 and 500 characters is required.");
  }
  if (!matchesEmergencyKey(key, process.env.DEVKIT_SUPER_ADMIN_EMERGENCY_KEY_HASH)) {
    throw AppError.unauthorized("A valid Super Administrator emergency key is required.");
  }
}

function header(headers: Record<string, string | string[] | undefined>, name: string) {
  const value = headers[name];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function matchesEmergencyKey(value: string, configuredHash: string | undefined) {
  const match = /^sha256:([a-f0-9]{64})$/iu.exec(configuredHash?.trim() ?? "");
  if (!value || !match?.[1]) return false;
  const actual = createHash("sha256").update(value).digest();
  const expected = Buffer.from(match[1], "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function wildcard(params: unknown) {
  return z.object({ "*": z.string().min(1).max(500) }).passthrough().parse(params)["*"];
}
