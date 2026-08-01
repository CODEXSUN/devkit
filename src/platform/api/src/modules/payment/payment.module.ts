import { defineModule } from "@codexsun/framework/modules";
import type { FastifyInstance } from "fastify";
import { registerPaymentRoutes } from "./payment.routes.js";

export const paymentModule = defineModule<{ app: FastifyInstance }>({
  key: "trades.payment",
  label: "Payment",
  register: ({ app }) => registerPaymentRoutes(app)
});
