import type { FastifyRequest } from "fastify";
import type { Kysely } from "kysely";
import { identityContext } from "./auth/identity-context.js";
import { recordAuditEvent } from "./database/audit.js";
import type { TradesDatabase } from "./database/schema.js";

export type TradesAuditEvent = {
  action: string;
  moduleKey: string;
  recordId: number;
  recordLabel: string;
  recordUuid: string;
};

export type TradesModuleContext = {
  actorEmail: string;
  audit(event: TradesAuditEvent): Promise<void>;
  authorize(permission: string): Promise<void>;
  clientId: "trades";
  database: Kysely<TradesDatabase>;
};

export function tradesRequestContext(request: FastifyRequest): TradesModuleContext {
  const context = identityContext(request);
  return {
    actorEmail: context.actorEmail,
    audit: (event) => recordAuditEvent({ ...event, actorEmail: context.actorEmail }),
    authorize: context.authorize,
    clientId: "trades",
    database: context.database
  };
}
