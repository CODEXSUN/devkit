import { defineModule } from "@codexsun/framework/modules";
import type { FastifyInstance } from "fastify";
import { registerCommissionRoutes } from "./commission.routes.js";

export const commissionModule = defineModule<{ app: FastifyInstance }>({
  key: "trades.commission",
  label: "Commission",
  register: ({ app }) => registerCommissionRoutes(app)
});
