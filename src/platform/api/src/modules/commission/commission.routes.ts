import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { registerContractRoute } from "@codexsun/framework/http";
import { tradesRequestContext } from "../../request-context.js";
import { CommissionService } from "./commission.service.js";

export const COMMISSION_COLLECTION_PATH = "/trades/commissions";
const statusSchema = z.enum(["active", "inactive"]);
const variantSchema = z.object({
  code: z.string(),
  displayOrder: z.number().int(),
  id: z.number().int().positive(),
  name: z.string(),
  percentage: z.number().nonnegative(),
  status: statusSchema,
  uuid: z.string().length(8)
});
const lineSchema = z.object({
  amount: z.number().nonnegative(),
  percentage: z.number().nonnegative(),
  variantId: z.number().int().positive(),
  variantName: z.string()
});
const entrySchema = z.object({
  amount: z.number().nonnegative(),
  date: z.string(),
  direction: z.enum(["deposit", "withdraw"]),
  id: z.number().int().positive(),
  lines: z.array(lineSchema),
  name: z.string().nullable(),
  reference: z.string().nullable(),
  settledAt: z.string().nullable(),
  settledBy: z.string().nullable(),
  tgCode: z.string(),
  totalCommission: z.number().nonnegative(),
  uuid: z.string().length(8),
  verifiedAt: z.string().nullable(),
  verifiedBy: z.string().nullable()
});
const listSchema = z.object({
  entries: z.array(entrySchema),
  totals: z.object({
    amount: z.number().nonnegative(),
    commission: z.number().nonnegative(),
    variants: z.array(
      z.object({ amount: z.number().nonnegative(), variantId: z.number().int().positive() })
    )
  }),
  variants: z.array(variantSchema)
});
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);
const querySchema = z
  .object({
    dateFrom: dateSchema.optional(),
    dateTo: dateSchema.optional(),
    lifecycle: z.enum(["all", "open", "settled", "unverified", "verified"]).optional()
  })
  .strict();
const idSchema = z.object({ id: z.string().regex(/^\d+$/u) });
const variantPayloadSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    percentage: z.number().min(0).max(100),
    status: statusSchema
  })
  .strict();

export async function registerCommissionRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: `${COMMISSION_COLLECTION_PATH}/deposits`,
    schemas: { querystring: querySchema, response: listSchema },
    handler: ({ query, request }) =>
      new CommissionService(tradesRequestContext(request)).listDeposits({
        ...(query.dateFrom ? { dateFrom: query.dateFrom } : {}),
        ...(query.dateTo ? { dateTo: query.dateTo } : {}),
        ...(query.lifecycle ? { lifecycle: query.lifecycle } : {})
      })
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${COMMISSION_COLLECTION_PATH}/withdrawals`,
    schemas: { querystring: querySchema, response: listSchema },
    handler: ({ query, request }) =>
      new CommissionService(tradesRequestContext(request)).listWithdrawals({
        ...(query.dateFrom ? { dateFrom: query.dateFrom } : {}),
        ...(query.dateTo ? { dateTo: query.dateTo } : {}),
        ...(query.lifecycle ? { lifecycle: query.lifecycle } : {})
      })
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${COMMISSION_COLLECTION_PATH}/variants`,
    schemas: { response: z.array(variantSchema) },
    handler: ({ request }) => new CommissionService(tradesRequestContext(request)).variants()
  });
  registerContractRoute(app, {
    method: "PUT",
    url: `${COMMISSION_COLLECTION_PATH}/variants/:id`,
    schemas: { body: variantPayloadSchema, params: idSchema, response: variantSchema },
    handler: ({ body, params, request }) =>
      new CommissionService(tradesRequestContext(request)).updateVariant(params.id, body)
  });
  registerContractRoute(app, {
    method: "POST",
    url: `${COMMISSION_COLLECTION_PATH}/deposits/:id/verify`,
    schemas: { params: idSchema, response: entrySchema },
    handler: ({ params, request }) =>
      new CommissionService(tradesRequestContext(request)).verifyDeposit(params.id)
  });
  registerContractRoute(app, {
    method: "POST",
    url: `${COMMISSION_COLLECTION_PATH}/withdrawals/:id/verify`,
    schemas: { params: idSchema, response: entrySchema },
    handler: ({ params, request }) =>
      new CommissionService(tradesRequestContext(request)).verifyWithdrawal(params.id)
  });
  registerContractRoute(app, {
    method: "POST",
    url: `${COMMISSION_COLLECTION_PATH}/deposits/:id/settle`,
    schemas: { params: idSchema, response: entrySchema },
    handler: ({ params, request }) =>
      new CommissionService(tradesRequestContext(request)).settleDeposit(params.id)
  });
  registerContractRoute(app, {
    method: "POST",
    url: `${COMMISSION_COLLECTION_PATH}/withdrawals/:id/settle`,
    schemas: { params: idSchema, response: entrySchema },
    handler: ({ params, request }) =>
      new CommissionService(tradesRequestContext(request)).settleWithdrawal(params.id)
  });
}
