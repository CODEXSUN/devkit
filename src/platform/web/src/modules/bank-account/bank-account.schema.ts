import { z } from "zod";

export const bankAccountSchema = z
  .object({
    accountName: z.string().trim().min(2, "Account name is required.").max(180),
    bankName: z.string().trim().min(2, "Bank name is required.").max(180),
    branch: z.string().trim().min(2, "Branch is required.").max(180),
    code: z.string().trim().min(1, "Bank code is required.").max(40),
    ifsc: z.string().trim().min(4, "IFSC is required.").max(20),
    openingBalance: z.number(),
    status: z.enum(["active", "inactive"])
  })
  .strict();

export const bankEntrySchema = z
  .object({
    amount: z.number().positive(),
    date: z.string().min(10),
    entryType: z.enum(["cash_deposit", "cash_withdrawal"]),
    narration: z.string().trim().max(300),
    reference: z.string().trim().min(1).max(180)
  })
  .strict();
export const bankTransferSchema = z
  .object({
    amount: z.number().positive(),
    date: z.string().min(10),
    fromBankAccountId: z.number().int().positive(),
    narration: z.string().trim().max(300),
    reference: z.string().trim().min(1).max(180),
    toBankAccountId: z.number().int().positive()
  })
  .strict();
