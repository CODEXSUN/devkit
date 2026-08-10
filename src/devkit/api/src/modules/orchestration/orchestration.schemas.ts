import { z } from "zod";

export const orchestrationPermissionLevelSchema = z.enum([
  "read-only",
  "development",
  "project",
  "deployment",
  "infrastructure",
  "production",
  "admin"
]);

export const orchestrationCatalogSchema = z
  .object({
    agentProfiles: z.array(
      z
        .object({
          capabilities: z.array(z.string().min(1)),
          defaultMode: z.string().min(1),
          description: z.string().min(1),
          id: z.string().min(1),
          name: z.string().min(1),
          permissionLevel: orchestrationPermissionLevelSchema,
          requiresApprovalFor: z.array(z.string().min(1)),
          status: z.literal("definition-ready")
        })
        .strict()
    ),
    architecture: z.literal("modular-monolith"),
    assistModes: z.array(
      z
        .object({
          id: z.string().min(1),
          label: z.string().min(1),
          permissionLevel: orchestrationPermissionLevelSchema,
          purpose: z.string().min(1)
        })
        .strict()
    ),
    controlBoundaries: z.array(
      z
        .object({
          description: z.string().min(1),
          id: z.string().min(1),
          title: z.string().min(1)
        })
        .strict()
    ),
    externalLabel: z.literal("CodeLogicX"),
    lifecycle: z.array(
      z
        .object({
          approvalRequired: z.boolean(),
          href: z.string().min(1),
          id: z.string().min(1),
          label: z.string().min(1),
          objective: z.string().min(1),
          state: z.enum(["connected", "foundation", "planned"])
        })
        .strict()
    ),
    technicalName: z.literal("devkit")
  })
  .strict();

export type OrchestrationCatalog = z.infer<typeof orchestrationCatalogSchema>;
