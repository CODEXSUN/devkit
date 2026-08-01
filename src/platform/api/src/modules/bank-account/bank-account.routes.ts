import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { registerContractRoute } from "@codexsun/framework/http";
import { tradesRequestContext } from "../../request-context.js";
import { BankAccountService } from "./bank-account.service.js";

export const BANK_ACCOUNT_COLLECTION_PATH = "/trades/bank-accounts";

const statusSchema = z.enum(["active", "inactive"]);
const accountSchema = z.object({
  accountName: z.string(),
  bankName: z.string(),
  branch: z.string(),
  code: z.string(),
  currentBalance: z.number(),
  id: z.number().int().positive(),
  ifsc: z.string(),
  openingBalance: z.number(),
  status: statusSchema,
  uuid: z.string().length(8)
});
const lookupSchema = accountSchema.pick({
  accountName: true,
  bankName: true,
  branch: true,
  code: true,
  id: true,
  ifsc: true,
  status: true,
  uuid: true
});
const accountPayloadSchema = z
  .object({
    accountName: z.string().trim().min(2).max(180),
    bankName: z.string().trim().min(2).max(180),
    branch: z.string().trim().min(2).max(180),
    code: z.string().trim().min(1).max(40),
    ifsc: z.string().trim().min(4).max(20),
    openingBalance: z.number(),
    status: statusSchema
  })
  .strict();
const entryTypeSchema = z.enum([
  "opening",
  "cash_deposit",
  "cash_withdrawal",
  "transfer_in",
  "transfer_out",
  "deposit",
  "payment"
]);
const directionSchema = z.enum(["debit", "credit"]);
const entrySchema = z.object({
  amount: z.number().nonnegative(),
  balance: z.number(),
  bankAccountId: z.number().int().positive(),
  counterpartyBankAccountId: z.number().int().positive().nullable(),
  counterpartyBankAccountName: z.string().nullable(),
  credit: z.number().nonnegative(),
  date: z.string(),
  debit: z.number().nonnegative(),
  direction: directionSchema,
  entryType: entryTypeSchema,
  id: z.number().int().positive(),
  narration: z.string(),
  reconciledAt: z.string().nullable(),
  reference: z.string(),
  sourceModule: z.string().nullable(),
  sourceRecordId: z.number().int().positive().nullable(),
  transferUuid: z.string().length(8).nullable(),
  uuid: z.string().length(8)
});
const statementSchema = z.object({
  account: accountSchema,
  entries: z.array(entrySchema),
  summary: z.object({
    closingBalance: z.number(),
    totalCredits: z.number(),
    totalDebits: z.number(),
    unreconciledCount: z.number().int().nonnegative()
  })
});
const idSchema = z.object({ id: z.string().regex(/^\d+$/u) });
const entryIdSchema = z.object({ entryId: z.string().regex(/^\d+$/u) });
const querySchema = z.object({ search: z.string().trim().optional() });
const manualEntrySchema = z
  .object({
    amount: z.number().positive(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
    entryType: z.enum(["cash_deposit", "cash_withdrawal"]),
    narration: z.string().trim().max(300),
    reference: z.string().trim().min(1).max(180)
  })
  .strict();
const transferSchema = z
  .object({
    amount: z.number().positive(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/u),
    fromBankAccountId: z.number().int().positive(),
    narration: z.string().trim().max(300),
    reference: z.string().trim().min(1).max(180),
    toBankAccountId: z.number().int().positive()
  })
  .strict();

export async function registerBankAccountRoutes(app: FastifyInstance) {
  registerContractRoute(app, {
    method: "GET",
    url: BANK_ACCOUNT_COLLECTION_PATH,
    schemas: { querystring: querySchema, response: z.array(accountSchema) },
    handler: ({ query, request }) =>
      new BankAccountService(tradesRequestContext(request)).list(query.search ?? "")
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${BANK_ACCOUNT_COLLECTION_PATH}/lookups`,
    schemas: { response: z.array(lookupSchema) },
    handler: ({ request }) => new BankAccountService(tradesRequestContext(request)).lookups()
  });
  registerContractRoute(app, {
    method: "POST",
    url: BANK_ACCOUNT_COLLECTION_PATH,
    schemas: { body: accountPayloadSchema, response: accountSchema },
    handler: ({ body, request }) =>
      new BankAccountService(tradesRequestContext(request)).create(body)
  });
  registerContractRoute(app, {
    method: "POST",
    url: `${BANK_ACCOUNT_COLLECTION_PATH}/transfer`,
    schemas: { body: transferSchema, response: statementSchema },
    handler: ({ body, request }) =>
      new BankAccountService(tradesRequestContext(request)).transfer(body)
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${BANK_ACCOUNT_COLLECTION_PATH}/:id`,
    schemas: { params: idSchema, response: accountSchema },
    handler: ({ params, request }) =>
      new BankAccountService(tradesRequestContext(request)).get(params.id)
  });
  registerContractRoute(app, {
    method: "PUT",
    url: `${BANK_ACCOUNT_COLLECTION_PATH}/:id`,
    schemas: { body: accountPayloadSchema, params: idSchema, response: accountSchema },
    handler: ({ body, params, request }) =>
      new BankAccountService(tradesRequestContext(request)).update(params.id, body)
  });
  registerContractRoute(app, {
    method: "GET",
    url: `${BANK_ACCOUNT_COLLECTION_PATH}/:id/statement`,
    schemas: { params: idSchema, response: statementSchema },
    handler: ({ params, request }) =>
      new BankAccountService(tradesRequestContext(request)).statement(params.id)
  });
  registerContractRoute(app, {
    method: "POST",
    url: `${BANK_ACCOUNT_COLLECTION_PATH}/:id/entries`,
    schemas: { body: manualEntrySchema, params: idSchema, response: statementSchema },
    handler: ({ body, params, request }) =>
      new BankAccountService(tradesRequestContext(request)).createManualEntry(params.id, body)
  });
  for (const [action, status] of [
    ["activate", "active"],
    ["deactivate", "inactive"]
  ] as const)
    registerContractRoute(app, {
      method: "POST",
      url: `${BANK_ACCOUNT_COLLECTION_PATH}/:id/${action}`,
      schemas: { params: idSchema, response: accountSchema },
      handler: ({ params, request }) =>
        new BankAccountService(tradesRequestContext(request)).setStatus(params.id, status)
    });
  for (const [action, reconciled] of [
    ["reconcile", true],
    ["unreconcile", false]
  ] as const)
    registerContractRoute(app, {
      method: "POST",
      url: `${BANK_ACCOUNT_COLLECTION_PATH}/entries/:entryId/${action}`,
      schemas: { params: entryIdSchema, response: statementSchema },
      handler: ({ params, request }) =>
        new BankAccountService(tradesRequestContext(request)).setReconciled(
          params.entryId,
          reconciled
        )
    });
  registerContractRoute(app, {
    method: "DELETE",
    url: `${BANK_ACCOUNT_COLLECTION_PATH}/:id/force`,
    schemas: { params: idSchema, response: accountSchema },
    handler: ({ params, request }) =>
      new BankAccountService(tradesRequestContext(request)).forceDelete(params.id)
  });
}
