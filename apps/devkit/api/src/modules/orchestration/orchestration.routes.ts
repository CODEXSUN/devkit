import { ok } from "@codexsun/framework/http";
import { AppError } from "@codexsun/framework/errors";
import type { FastifyInstance } from "fastify";
import { Readable } from "node:stream";
import { z } from "zod";
import { OrchestrationService } from "./orchestration.service.js";
import {
  agentIdePlanInputSchema,
  agentCommitInputSchema,
  agentDecompositionInputSchema,
  agentPersonaInputSchema,
  agentPersonaAssignmentSchema,
  agentParentReviewInputSchema,
  agentReworkInputSchema,
  agentTaskStatusInputSchema,
  codexApiKeyLoginSchema,
  codexApprovalInputSchema,
  codexChatInputSchema,
  codexConnectionInputSchema,
  codexLoginCancelSchema,
  modelProviderInputSchema,
  modelProviderParamSchema
} from "./orchestration.schemas.js";
import { OpenAiPlanningGateway } from "./orchestration.model-gateway.js";
import { launchDeskInputSchema } from "./orchestration.schemas.js";
import { LaunchDeskAgent } from "./launch-desk.agent.js";
import { codexAppServer, codexConnectorPool } from "./codex-connector.pool.js";
import { CodexChatService } from "./codex-chat.service.js";
import { requireDevkitActor } from "../../request-context.js";
import { orchestrationChatRepository } from "./orchestration-chat.repository.js";
import { agentRunRepository } from "./agent-run.repository.js";
import { agentPolicyService } from "./agent-run.policy.js";
import { agentWorktreeService } from "./agent-worktree.service.js";
import { agentVerificationService } from "./agent-verification.service.js";
import { agentIntegrationService } from "./agent-integration.service.js";
import { agentTaskGraphRepository } from "./agent-task-graph.repository.js";
import { agentPersonaRepository } from "./agent-persona.repository.js";
import { agentDelegateExecutor } from "./agent-delegate.executor.js";
import { hostingerMcpService } from "./hostinger-mcp.service.js";
import { hostingerDashboardService } from "./hostinger-dashboard.service.js";
import { hostingerSshService } from "./hostinger-ssh.service.js";
import { modelProviderService } from "./model-provider.service.js";
import { codexRuntimeService } from "./codex-runtime.service.js";

const service = new OrchestrationService();
const planningGateway = new OpenAiPlanningGateway();
const launchDesk = new LaunchDeskAgent();
const codexChat = new CodexChatService();
const hostingerSshTargetSchema = z
  .object({
    host: z
      .string()
      .trim()
      .min(1)
      .max(253)
      .regex(/^[a-z0-9.:-]+$/iu),
    name: z
      .string()
      .trim()
      .min(3)
      .max(80)
      .regex(/^[a-z0-9._-]+$/iu),
    port: z.coerce.number().int().min(1).max(65535),
    user: z
      .string()
      .trim()
      .min(1)
      .max(32)
      .regex(/^[a-z_][a-z0-9_-]*$/iu),
    virtualMachineId: z.coerce.number().int().positive()
  })
  .strict();
const hostingerCredentialSchema = z.object({ token: z.string().trim().min(1).max(4096) }).strict();

export async function registerOrchestrationRoutes(app: FastifyInstance) {
  let recoveryReported = false;
  app.addHook("preHandler", async () => {
    const recoveredDelegates = await agentDelegateExecutor.recoverOnce();
    if (!recoveredDelegates || recoveryReported) return;
    recoveryReported = true;
    app.log.info({ recoveredDelegates }, "Recovered named Agent delegates after API restart.");
  });
  app.get("/orchestration/catalog", async (request) =>
    ok(service.catalog(), { requestId: request.id })
  );
  app.get("/orchestration/agent-ide/settings", async (request) =>
    ok(planningGateway.status(), { requestId: request.id })
  );
  app.get("/orchestration/model-providers", async (request) =>
    ok(await modelProviderService.list(requireDevkitActor().id), { requestId: request.id })
  );
  app.put("/orchestration/model-providers/:provider", async (request) => {
    const { provider } = modelProviderParamSchema.parse(request.params);
    return ok(
      await modelProviderService.save(
        provider,
        modelProviderInputSchema.parse(request.body),
        requireDevkitActor().id
      ),
      { requestId: request.id }
    );
  });
  app.post("/orchestration/model-providers/:provider/test", async (request) => {
    const { provider } = modelProviderParamSchema.parse(request.params);
    return ok(await modelProviderService.test(provider, requireDevkitActor().id), {
      requestId: request.id
    });
  });
  app.post("/orchestration/model-providers/:provider/disconnect", async (request) => {
    const { provider } = modelProviderParamSchema.parse(request.params);
    return ok(await modelProviderService.remove(provider, requireDevkitActor().id), {
      requestId: request.id
    });
  });
  app.post("/orchestration/agent-ide/settings/test", async (request) =>
    ok(await planningGateway.testConnection(), { requestId: request.id })
  );
  app.post("/orchestration/agent-ide/plan", async (request) =>
    ok(await planningGateway.createPlan(agentIdePlanInputSchema.parse(request.body)), {
      requestId: request.id
    })
  );
  app.post("/orchestration/agent-ide/codex/chat/stream", async (request, reply) => {
    const input = codexChatInputSchema.parse(request.body);
    const actorId = requireDevkitActor().id;
    const origin = request.headers.origin;
    return reply
      .headers({
        ...(origin
          ? {
              "access-control-allow-credentials": "true",
              "access-control-allow-origin": origin,
              vary: "Origin"
            }
          : {}),
        "cache-control": "no-cache, no-transform",
        "content-type": "application/x-ndjson; charset=utf-8",
        "x-accel-buffering": "no"
      })
      .send(Readable.from(codexChatLines(input, actorId)));
  });
  app.get("/orchestration/agent-ide/chats", async (request) =>
    ok(await orchestrationChatRepository.list(requireDevkitActor().id), { requestId: request.id })
  );
  app.get("/orchestration/agent-ide/chats/archived", async (request) =>
    ok(await orchestrationChatRepository.listArchived(requireDevkitActor().id), {
      requestId: request.id
    })
  );
  app.delete("/orchestration/agent-ide/chats/archived", async (request) =>
    ok(await orchestrationChatRepository.forceDeleteArchived(requireDevkitActor().id), {
      requestId: request.id
    })
  );
  app.get("/orchestration/agent-ide/runs", async (request) => {
    const { projectUuid } = z
      .object({ projectUuid: z.string().min(1).max(160) })
      .strict()
      .parse(request.query);
    return ok(await agentRunRepository.list(projectUuid, requireDevkitActor().id), {
      requestId: request.id
    });
  });
  app.get("/orchestration/agent-ide/personas", async (request) =>
    ok(await agentPersonaRepository.list(requireDevkitActor().id), { requestId: request.id })
  );
  app.post("/orchestration/agent-ide/personas", async (request) =>
    ok(
      await agentPersonaRepository.create(
        agentPersonaInputSchema.parse(request.body),
        requireDevkitActor().id
      ),
      { requestId: request.id }
    )
  );
  app.put("/orchestration/agent-ide/personas/:uuid", async (request) => {
    const { uuid } = z
      .object({ uuid: z.string().length(16) })
      .strict()
      .parse(request.params);
    return ok(
      await agentPersonaRepository.update(
        uuid,
        agentPersonaInputSchema.parse(request.body),
        requireDevkitActor().id
      ),
      { requestId: request.id }
    );
  });
  app.post("/orchestration/agent-ide/personas/starter-team", async (request) =>
    ok(await agentPersonaRepository.createStarterTeam(requireDevkitActor().id), {
      requestId: request.id
    })
  );
  app.get("/orchestration/agent-ide/runs/:uuid", async (request) => {
    const { uuid } = z
      .object({ uuid: z.string().length(16) })
      .strict()
      .parse(request.params);
    return ok(await agentRunRepository.find(uuid, requireDevkitActor().id), {
      requestId: request.id
    });
  });
  app.get("/orchestration/agent-ide/runs/:uuid/tasks", async (request) => {
    const { uuid } = z
      .object({ uuid: z.string().length(16) })
      .strict()
      .parse(request.params);
    return ok(await agentTaskGraphRepository.find(uuid, requireDevkitActor().id), {
      requestId: request.id
    });
  });
  app.put("/orchestration/agent-ide/runs/:uuid/tasks", async (request) => {
    const { uuid } = z
      .object({ uuid: z.string().length(16) })
      .strict()
      .parse(request.params);
    const input = agentDecompositionInputSchema.parse(request.body);
    return ok(await agentTaskGraphRepository.replace(uuid, requireDevkitActor().id, input), {
      requestId: request.id
    });
  });
  app.post("/orchestration/agent-ide/tasks/:uuid/start", async (request) => {
    const { uuid } = z
      .object({ uuid: z.string().length(16) })
      .strict()
      .parse(request.params);
    return ok(await agentDelegateExecutor.call(uuid, requireDevkitActor().id), {
      requestId: request.id
    });
  });
  app.put("/orchestration/agent-ide/tasks/:uuid/delegate", async (request) => {
    const { uuid } = z
      .object({ uuid: z.string().length(16) })
      .strict()
      .parse(request.params);
    const { personaUuid } = agentPersonaAssignmentSchema.parse(request.body);
    return ok(
      await agentTaskGraphRepository.assignDelegate(uuid, requireDevkitActor().id, personaUuid),
      { requestId: request.id }
    );
  });
  app.put("/orchestration/agent-ide/runs/:uuid/supervisor", async (request) => {
    const { uuid } = z
      .object({ uuid: z.string().length(16) })
      .strict()
      .parse(request.params);
    const { personaUuid } = agentPersonaAssignmentSchema.parse(request.body);
    return ok(
      await agentTaskGraphRepository.assignSupervisor(uuid, requireDevkitActor().id, personaUuid),
      { requestId: request.id }
    );
  });
  app.post("/orchestration/agent-ide/tasks/:uuid/finish", async (request) => {
    const { uuid } = z
      .object({ uuid: z.string().length(16) })
      .strict()
      .parse(request.params);
    const input = agentTaskStatusInputSchema.parse(request.body);
    return ok(
      await agentTaskGraphRepository.finish(
        uuid,
        requireDevkitActor().id,
        input.status,
        input.resultSummary
      ),
      { requestId: request.id }
    );
  });
  app.post("/orchestration/agent-ide/runs/:uuid/parent-review", async (request) => {
    const { uuid } = z
      .object({ uuid: z.string().length(16) })
      .strict()
      .parse(request.params);
    const input = agentParentReviewInputSchema.parse(request.body);
    return ok(
      await agentTaskGraphRepository.review(
        uuid,
        requireDevkitActor().id,
        input.decision,
        input.note
      ),
      { requestId: request.id }
    );
  });
  app.post("/orchestration/agent-ide/runs/:uuid/workspace/cleanup", async (request) => {
    const { uuid } = z
      .object({ uuid: z.string().length(16) })
      .strict()
      .parse(request.params);
    const actorId = requireDevkitActor().id;
    const workspace = await agentRunRepository.workspace(uuid, actorId);
    const result = await agentWorktreeService.cleanup(workspace);
    await agentRunRepository.markWorkspaceCleaned(uuid, actorId);
    return ok(result, { requestId: request.id });
  });
  app.get("/orchestration/agent-ide/verification/commands", async (request) =>
    ok(agentVerificationService.catalog(), { requestId: request.id })
  );
  app.post("/orchestration/agent-ide/runs/:uuid/verification", async (request) => {
    const { uuid } = z
      .object({ uuid: z.string().length(16) })
      .strict()
      .parse(request.params);
    return ok(await agentVerificationService.run(uuid, requireDevkitActor().id), {
      requestId: request.id
    });
  });
  app.post("/orchestration/agent-ide/runs/:uuid/rework", async (request) => {
    const { uuid } = z
      .object({ uuid: z.string().length(16) })
      .strict()
      .parse(request.params);
    const { note } = agentReworkInputSchema.parse(request.body);
    return ok(await agentRunRepository.requestRework(uuid, requireDevkitActor().id, note), {
      requestId: request.id
    });
  });
  app.post("/orchestration/agent-ide/runs/:uuid/commit", async (request) => {
    const { uuid } = z
      .object({ uuid: z.string().length(16) })
      .strict()
      .parse(request.params);
    const { message } = agentCommitInputSchema.parse(request.body);
    return ok(await agentIntegrationService.commit(uuid, requireDevkitActor().id, message), {
      requestId: request.id
    });
  });
  app.get("/orchestration/agent-ide/tools", async (request) =>
    ok(agentPolicyService.catalog(), { requestId: request.id })
  );
  app.get("/orchestration/agent-ide/chats/:uuid", async (request) => {
    const { uuid } = z
      .object({ uuid: z.string().length(16) })
      .strict()
      .parse(request.params);
    return ok(await orchestrationChatRepository.find(uuid, requireDevkitActor().id), {
      requestId: request.id
    });
  });
  app.delete("/orchestration/agent-ide/chats/:uuid", async (request) => {
    const { uuid } = z
      .object({ uuid: z.string().length(16) })
      .strict()
      .parse(request.params);
    return ok(await orchestrationChatRepository.archive(uuid, requireDevkitActor().id), {
      requestId: request.id
    });
  });
  app.put("/orchestration/agent-ide/chats/:uuid/pin", async (request) => {
    const { uuid } = z
      .object({ uuid: z.string().length(16) })
      .strict()
      .parse(request.params);
    const { pinned } = z.object({ pinned: z.boolean() }).strict().parse(request.body);
    return ok(
      await orchestrationChatRepository.setPinned(uuid, pinned, requireDevkitActor().id),
      { requestId: request.id }
    );
  });
  app.put("/orchestration/agent-ide/chats/:uuid/restore", async (request) => {
    const { uuid } = z
      .object({ uuid: z.string().length(16) })
      .strict()
      .parse(request.params);
    return ok(await orchestrationChatRepository.restore(uuid, requireDevkitActor().id), {
      requestId: request.id
    });
  });
  app.delete("/orchestration/agent-ide/chats/:uuid/force", async (request) => {
    const { uuid } = z
      .object({ uuid: z.string().length(16) })
      .strict()
      .parse(request.params);
    return ok(await orchestrationChatRepository.forceDelete(uuid, requireDevkitActor().id), {
      requestId: request.id
    });
  });
  app.put("/orchestration/agent-ide/chat-messages/:uuid/feedback", async (request) => {
    const { uuid } = z
      .object({ uuid: z.string().length(16) })
      .strict()
      .parse(request.params);
    const { feedback } = z
      .object({ feedback: z.enum(["up", "down"]).nullable() })
      .strict()
      .parse(request.body);
    return ok(
      await orchestrationChatRepository.setFeedback(uuid, feedback, requireDevkitActor().id),
      { requestId: request.id }
    );
  });
  app.post("/orchestration/agent-ide/codex/approval", async (request) => {
    const input = codexApprovalInputSchema.parse(request.body);
    codexConnectorPool.resolveApproval(input.threadId, input.requestId, input.decision);
    await agentRunRepository.resolveApproval(requireDevkitActor().id, input);
    return ok({ resolved: true }, { requestId: request.id });
  });
  app.get("/orchestration/codex/status", async (request) =>
    ok(await codexAppServer.status(), { requestId: request.id })
  );
  app.get("/orchestration/codex/connections", async (request) =>
    ok(await codexConnectorPool.statuses(), { requestId: request.id })
  );
  app.post("/orchestration/codex/update", async (request) => {
    const actor = requireDevkitActor();
    if (!actor.roles.includes("super-admin")) {
      throw AppError.forbidden("Only a super administrator can update the Codex runtime.");
    }
    return ok(await codexRuntimeService.update(), { requestId: request.id });
  });
  app.post("/orchestration/codex/device-login", async (request) => {
    const { connectionId } = codexConnectionInputSchema.parse(request.body ?? {});
    return ok(await codexConnectorPool.client(connectionId).startDeviceLogin(), {
      requestId: request.id
    });
  });
  app.post("/orchestration/codex/browser-login", async (request) => {
    const { connectionId } = codexConnectionInputSchema.parse(request.body ?? {});
    return ok(await codexConnectorPool.client(connectionId).startBrowserLogin(), {
      requestId: request.id
    });
  });
  app.post("/orchestration/codex/api-key-login", async (request) => {
    const { apiKey, connectionId } = codexApiKeyLoginSchema.parse(request.body);
    return ok(await codexConnectorPool.client(connectionId).loginApiKey(apiKey), {
      requestId: request.id
    });
  });
  app.post("/orchestration/codex/login-cancel", async (request) => {
    const { connectionId, loginId } = codexLoginCancelSchema.parse(request.body);
    await codexConnectorPool.client(connectionId).cancelLogin(loginId);
    return ok({ cancelled: true }, { requestId: request.id });
  });
  app.post("/orchestration/codex/logout", async (request) => {
    const { connectionId } = codexConnectionInputSchema.parse(request.body ?? {});
    await codexConnectorPool.client(connectionId).logout();
    return ok({ disconnected: true }, { requestId: request.id });
  });
  app.get("/orchestration/integrations/hostinger/status", async (request) =>
    ok(await hostingerMcpService.status(), { requestId: request.id })
  );
  app.post("/orchestration/integrations/hostinger/configure", async (request) =>
    ok(await hostingerMcpService.configure(), { requestId: request.id })
  );
  app.put("/orchestration/integrations/hostinger/credential", async (request) => {
    const { token } = hostingerCredentialSchema.parse(request.body);
    return ok(await hostingerMcpService.saveToken(token), { requestId: request.id });
  });
  app.get("/orchestration/integrations/hostinger/dashboard", async (request) =>
    ok(await hostingerDashboardService.dashboard(), { requestId: request.id })
  );
  app.get("/orchestration/integrations/hostinger/ssh", async (request) =>
    ok(await hostingerSshService.status(hostingerSshTargetSchema.parse(request.query)), {
      requestId: request.id
    })
  );
  app.post("/orchestration/integrations/hostinger/ssh/generate", async (request) =>
    ok(await hostingerSshService.generateAndAttach(hostingerSshTargetSchema.parse(request.body)), {
      requestId: request.id
    })
  );
  app.post("/orchestration/integrations/hostinger/ssh/test", async (request) =>
    ok(await hostingerSshService.test(hostingerSshTargetSchema.parse(request.body)), {
      requestId: request.id
    })
  );
  app.post("/orchestration/launch-desk/stream", async (request, reply) => {
    const input = launchDeskInputSchema.parse(request.body);
    reply.hijack();
    reply.raw.writeHead(200, {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no"
    });
    request.raw.on("aborted", () => reply.raw.end());
    for await (const event of launchDesk.stream(input)) {
      if (reply.raw.destroyed) break;
      reply.raw.write(`${JSON.stringify(event)}\n`);
    }
    if (!reply.raw.destroyed) reply.raw.end();
  });
}

async function* codexChatLines(
  input: Parameters<CodexChatService["stream"]>[0],
  actorId: string
) {
  for await (const event of codexChat.stream(input, actorId)) {
    yield `${JSON.stringify(event)}\n`;
  }
}
