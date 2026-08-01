import { defineModule } from "@codexsun/framework/modules";
import type { FastifyInstance } from "fastify";
import { registerDepositRoutes } from "./deposit.routes.js";

export const depositModule = defineModule<{ app: FastifyInstance }>({
  key: "trades.deposit",
  label: "Deposit",
  register: ({ app }) => registerDepositRoutes(app)
});
