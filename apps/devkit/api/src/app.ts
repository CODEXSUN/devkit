import "@codexsun/framework/api";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import { bootstrapDevkitDatabase, runWithDevkitDatabase } from "./database/index.js";
import type { DevkitDatabase } from "./database/index.js";
import { projectManagerModule } from "./modules/project-manager/index.js";
import { taskManagerModule } from "./modules/task-manager/index.js";
import { githubDashboardModule } from "./modules/github-dashboard/index.js";
import { syncModule } from "./modules/sync/index.js";
import { planningModule } from "./modules/planning/index.js";
import { orchestrationModule } from "./modules/orchestration/index.js";
import { skillsModule } from "./modules/skills/index.js";
import { telegramSupportModule } from "./modules/telegram-support/index.js";
import { honeyModule } from "./modules/honey/index.js";
import { notificationModule } from "./modules/notification/index.js";
import { messengerModule } from "./modules/messenger/index.js";
import { runWithDevkitActor, type DevkitActor } from "./request-context.js";

export const devkitApiModuleKeys = [
  projectManagerModule.key,
  taskManagerModule.key,
  githubDashboardModule.key,
  planningModule.key,
  orchestrationModule.key,
  skillsModule.key,
  telegramSupportModule.key,
  honeyModule.key,
  notificationModule.key,
  messengerModule.key,
  syncModule.key
] as const;

export type DevkitHostRequestContext = {
  actor: DevkitActor;
  database: Kysely<DevkitDatabase>;
};

export type DevkitHostAdapter = {
  authorize?(input: {
    context: DevkitHostRequestContext;
    request: FastifyRequest;
  }): Promise<void> | void;
  resolve(request: FastifyRequest): Promise<DevkitHostRequestContext> | DevkitHostRequestContext;
  resolveCloudSync?(
    request: FastifyRequest
  ): Promise<DevkitHostRequestContext> | DevkitHostRequestContext;
  resolvePublicWebhook?(
    request: FastifyRequest
  ): Promise<DevkitHostRequestContext> | DevkitHostRequestContext;
};

export async function registerDevkitApiForHost(app: FastifyInstance, adapter: DevkitHostAdapter) {
  await app.register(async (devkitApp) => {
    const contexts = new WeakMap<FastifyRequest, DevkitHostRequestContext>();
    devkitApp.addHook("onRequest", (request, _reply, done) => {
      const resolve =
        request.url.includes("/telegram/webhook") && adapter.resolvePublicWebhook
          ? adapter.resolvePublicWebhook
          : request.url.includes("/sync/cloud/") && adapter.resolveCloudSync
            ? adapter.resolveCloudSync
            : adapter.resolve;
      void Promise.resolve(resolve.call(adapter, request))
        .then((context) => {
          contexts.set(request, context);
          runWithDevkitDatabase(context.database, () => runWithDevkitActor(context.actor, done));
        })
        .catch((error: unknown) => done(error as Error));
    });
    devkitApp.addHook("preHandler", async (request) => {
      const context = contexts.get(request);
      if (!context) throw new Error("DevKit host request context is unavailable.");
      await bootstrapDevkitDatabase(context.database);
      await adapter.authorize?.({ context, request });
    });
    for (const module of devkitModules) {
      console.info(`[devkit.module] loading ${module.key}`);
      await module.register({ app: devkitApp });
      console.info(`[devkit.module] ready ${module.key}`);
    }
  });
}

const devkitModules = [
  projectManagerModule,
  taskManagerModule,
  githubDashboardModule,
  planningModule,
  orchestrationModule,
  skillsModule,
  telegramSupportModule,
  honeyModule,
  notificationModule,
  messengerModule,
  syncModule
] as const;
