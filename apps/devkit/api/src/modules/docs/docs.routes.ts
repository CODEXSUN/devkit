import { ok } from "@codexsun/framework/http";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { DocsService } from "./docs.service.js";

const service = new DocsService();
const paramsSchema = z.object({
  formKey: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/u)
    .max(120),
  pageSlug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+$/u)
    .max(120)
});
const valuesSchema = z
  .record(z.string().trim().min(1).max(80), z.string().max(4000))
  .refine(
    (values) => Object.keys(values).length <= 40,
    "A documentation form can have at most 40 values."
  );

export function registerDocsRoutes(app: FastifyInstance) {
  app.get("/docs/forms/:pageSlug/:formKey", async (request) => {
    const { formKey, pageSlug } = paramsSchema.parse(request.params);
    return ok(await service.getFormValues(pageSlug, formKey), { requestId: request.id });
  });
  app.put("/docs/forms/:pageSlug/:formKey", async (request) => {
    const { formKey, pageSlug } = paramsSchema.parse(request.params);
    const values = valuesSchema.parse((request.body as { values?: unknown }).values);
    return ok(await service.saveFormValues(pageSlug, formKey, values), { requestId: request.id });
  });
}
