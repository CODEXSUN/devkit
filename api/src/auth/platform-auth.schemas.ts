import { z } from "zod";

export const platformDeskSchema = z.literal("dev");
export const platformUserTypeSchema = z.enum(["super_admin", "staff"]);

export const platformLoginInputSchema = z
  .object({
    desk: platformDeskSchema,
    email: z.string().trim().email(),
    password: z.string().min(1),
  })
  .strict();

export const platformLoginResultSchema = z
  .object({
    accessToken: z.string().min(1),
    email: z.string().email(),
    name: z.string().optional(),
    userType: platformUserTypeSchema,
  })
  .strict();

export const platformSessionSchema = z
  .object({
    authenticated: z.literal(true),
    email: z.string().email(),
    expiresAt: z.string(),
    name: z.string().optional(),
    sessionIssuedAt: z.string().optional(),
    userType: platformUserTypeSchema,
  })
  .strict();

export const platformLogoutResultSchema = z
  .object({
    loggedOut: z.literal(true),
  })
  .strict();

export type PlatformDesk = z.infer<typeof platformDeskSchema>;
export type PlatformLoginInput = z.infer<typeof platformLoginInputSchema>;
export type PlatformLoginResult = z.infer<typeof platformLoginResultSchema>;
export type PlatformSession = z.infer<typeof platformSessionSchema>;
