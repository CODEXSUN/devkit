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

export const agentIdePlanInputSchema = z
  .object({
    brief: z.string().min(10).max(30_000),
    projectId: z.string().min(1).max(160),
    projectTitle: z.string().min(1).max(240)
  })
  .strict();

export const agentIdePlanResultSchema = z
  .object({
    model: z.string().min(1),
    output: z.string().min(1),
    provider: z.literal("openai"),
    responseId: z.string().min(1)
  })
  .strict();

export type AgentIdePlanInput = z.infer<typeof agentIdePlanInputSchema>;
export type AgentIdePlanResult = z.infer<typeof agentIdePlanResultSchema>;

export const launchDeskInputSchema = z.object({
  productBrief: z.string().trim().min(20).max(20_000),
  audience: z.string().trim().min(2).max(2_000),
  launchDate: z.iso.date(),
  constraints: z.string().trim().max(8_000).default(""),
  availableAssets: z.array(z.string().trim().min(1).max(500)).max(30).default([])
});

export type LaunchDeskInput = z.infer<typeof launchDeskInputSchema>;

export const codexLoginCancelSchema = z.object({
  loginId: z.string().uuid()
});

export const codexChatInputSchema = z
  .object({
    access: z.enum(["plan", "read-only", "ask-approval", "auto-approve", "full-access"]),
    attachments: z
      .array(
        z.object({
          content: z.string().max(3_000_000),
          kind: z.enum(["image", "text"]),
          mimeType: z.string().max(160),
          name: z.string().min(1).max(255),
          size: z.number().int().nonnegative().max(2_097_152)
        })
      )
      .max(5),
    message: z.string().trim().min(1).max(30_000),
    conversationId: z.string().length(16).nullable(),
    model: z.enum(["gpt-5.6-sol", "gpt-5.6-terra", "gpt-5.6-luna"]),
    threadId: z.string().min(1).nullable(),
    project: z
      .object({
        id: z.string().min(1),
        key: z.string().min(1).max(160),
        title: z.string().min(1).max(240),
        description: z.string().max(4_000),
        moduleKey: z.string().max(160),
        referenceId: z.string().max(500),
        referenceType: z.string().max(160)
      })
      .strict()
  })
  .strict();

export type CodexChatInput = z.infer<typeof codexChatInputSchema>;

export const codexApprovalInputSchema = z
  .object({
    decision: z.enum(["accept", "acceptForSession", "decline"]),
    requestId: z.number().int().positive(),
    threadId: z.string().min(1)
  })
  .strict();

export const agentReworkInputSchema = z.object({
  note: z.string().trim().min(3).max(4_000)
}).strict();

export const agentCommitInputSchema = z.object({
  approved: z.literal(true),
  message: z.string().trim().min(3).max(240)
}).strict();
