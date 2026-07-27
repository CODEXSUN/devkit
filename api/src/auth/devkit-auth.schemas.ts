import { z } from "zod";

export const devkitUserRoleSchema = z.literal("developer_admin");
export const devkitUserTypeSchema = z.literal("developer");

export const devkitLoginInputSchema = z
  .object({
    email: z.string().trim().email(),
    password: z.string().min(1),
  })
  .strict();

export const devkitLoginResultSchema = z
  .object({
    accessToken: z.string().min(1),
    email: z.string().email(),
    name: z.string().min(1),
    role: devkitUserRoleSchema,
    userType: devkitUserTypeSchema,
  })
  .strict();

export const devkitSessionSchema = z
  .object({
    authenticated: z.literal(true),
    email: z.string().email(),
    expiresAt: z.string(),
    name: z.string().min(1),
    role: devkitUserRoleSchema,
    sessionIssuedAt: z.string(),
    userType: devkitUserTypeSchema,
  })
  .strict();

export const devkitLogoutResultSchema = z
  .object({ loggedOut: z.literal(true) })
  .strict();

export type DevkitLoginInput = z.infer<typeof devkitLoginInputSchema>;
export type DevkitLoginResult = z.infer<typeof devkitLoginResultSchema>;
export type DevkitSession = z.infer<typeof devkitSessionSchema>;
export type DevkitUserRole = z.infer<typeof devkitUserRoleSchema>;
