import { defineModule } from "@codexsun/framework/modules";
import type { FastifyInstance } from "fastify";
import { registerBankAccountRoutes } from "./bank-account.routes.js";

export const bankAccountModule = defineModule<{ app: FastifyInstance }>({
  key: "trades.bank-account",
  label: "Bank Accounts",
  register: ({ app }) => registerBankAccountRoutes(app)
});
