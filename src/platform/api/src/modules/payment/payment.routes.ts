import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { AppError } from "@codexsun/framework/errors";
import { registerContractRoute } from "@codexsun/framework/http";
import { tradesRequestContext } from "../../request-context.js";
import { PaymentService } from "./payment.service.js";

export const PAYMENT_COLLECTION_PATH = "/trades/payments";

const statusSchema = z.enum(["active", "inactive"]);
const paymentSchema = z.object({
  amount: z.number().positive(),
  bank: z.string(),
  bankAccountId: z.number().int().positive().nullable(),
  bankCode: z.string().nullable(),
  date: z.string(),
  id: z.number().int().positive(),
  name: z.string().nullable(),
  reference: z.string().nullable(),
  settledAt: z.string().nullable(),
  settledBy: z.string().nullable(),
  status: statusSchema,
  tgCode: z.string(),
  uuid: z.string().length(8),
  verifiedAt: z.string().nullable(),
  verifiedBy: z.string().nullable()
});
const paymentPayloadSchema = z
  .object({
    amount: z.number().positive(),
    bankAccountId: z.number().int().positive(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Payment date must use YYYY-MM-DD."),
    name: optionalTextSchema(200),
    reference: optionalTextSchema(180),
    status: statusSchema,
    tgCode: z.string().trim().min(1).max(80)
  })
  .strict();
const idParamsSchema = z.object({ id: z.string().regex(/^\d+$/, "Payment ID must be numeric.") });
const lifecycleSchema = z.enum(["all", "open", "settled", "unverified", "verified"]);
const querySchema = z.object({ lifecycle: lifecycleSchema.optional(), search: z.string().trim().optional() });

function optionalTextSchema(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .nullable()
    .transform((value) => value || null);
}

export async function registerPaymentRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    handler: ({ query, request }) =>
      new PaymentService(tradesRequestContext(request)).list(
        {
          ...(query.lifecycle ? { lifecycle: query.lifecycle } : {}),
          ...(query.search ? { search: query.search } : {})
        }
      ),
    method: "GET",
    schemas: { querystring: querySchema, response: z.array(paymentSchema) },
    url: PAYMENT_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: async ({ params, request }) => {
      const record = await new PaymentService(tradesRequestContext(request)).get(params.id);
      if (!record) throw AppError.notFound("Payment was not found.");
      return record;
    },
    method: "GET",
    schemas: { params: idParamsSchema, response: paymentSchema },
    url: `${PAYMENT_COLLECTION_PATH}/:id`
  });
  registerContractRoute(app, {
    handler: ({ body, request }) => new PaymentService(tradesRequestContext(request)).create(body),
    method: "POST",
    schemas: { body: paymentPayloadSchema, response: paymentSchema },
    url: PAYMENT_COLLECTION_PATH
  });
  registerContractRoute(app, {
    handler: ({ body, params, request }) =>
      new PaymentService(tradesRequestContext(request)).update(params.id, body),
    method: "PUT",
    schemas: {
      body: paymentPayloadSchema,
      params: idParamsSchema,
      response: paymentSchema
    },
    url: `${PAYMENT_COLLECTION_PATH}/:id`
  });
  registerStatusRoute(app, "activate", "active");
  registerStatusRoute(app, "deactivate", "inactive");
  for (const action of ["verify", "settle"] as const) {
    registerContractRoute(app, {
      handler: ({ params, request }) =>
        new PaymentService(tradesRequestContext(request))[action](params.id),
      method: "POST",
      schemas: { params: idParamsSchema, response: paymentSchema },
      url: `${PAYMENT_COLLECTION_PATH}/:id/${action}`
    });
  }
  registerContractRoute(app, {
    handler: ({ params, request }) =>
      new PaymentService(tradesRequestContext(request)).forceDelete(params.id),
    method: "DELETE",
    schemas: { params: idParamsSchema, response: paymentSchema },
    url: `${PAYMENT_COLLECTION_PATH}/:id/force`
  });
}

function registerStatusRoute(
  app: FastifyInstance,
  action: "activate" | "deactivate",
  status: z.infer<typeof statusSchema>
) {
  registerContractRoute(app, {
    handler: ({ params, request }) =>
      new PaymentService(tradesRequestContext(request)).setStatus(params.id, status),
    method: "POST",
    schemas: { params: idParamsSchema, response: paymentSchema },
    url: `${PAYMENT_COLLECTION_PATH}/:id/${action}`
  });
}
