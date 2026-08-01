import { z } from "zod";

export const commissionVariantSchema = z
  .object({
    name: z.string().trim().min(1, "Variant name is required.").max(120),
    percentage: z
      .number()
      .min(0, "Percentage cannot be negative.")
      .max(100, "Percentage cannot exceed 100."),
    status: z.enum(["active", "inactive"])
  })
  .strict();

export const commissionVariantsSchema = z.array(commissionVariantSchema).min(1);
