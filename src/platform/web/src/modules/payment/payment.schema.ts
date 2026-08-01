import { z } from "zod";

export const paymentSchema = z
  .object({
    amount: z.number().positive("Payment amount must be greater than zero."),
    bankAccountId: z.number().int().positive("Bank account is required."),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Payment date is required."),
    name: optionalTextSchema(200),
    reference: optionalTextSchema(180),
    status: z.enum(["active", "inactive"]),
    tgCode: z.string().trim().min(1, "TG code is required.").max(80)
  })
  .strict();

function optionalTextSchema(maxLength: number) {
  return z
    .string()
    .trim()
    .max(maxLength)
    .nullable()
    .transform((value) => value || null);
}
