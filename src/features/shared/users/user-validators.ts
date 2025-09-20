import { z } from "zod";
import { UserRole } from "@prisma/client";

const userRoleSchema = z.nativeEnum(UserRole);

const lastLoginSchema = z
  .union([z.date(), z.string(), z.number()])
  .nullable()
  .optional();

export const userWithPasskeySchema = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  email: z.string().email(),
  role: userRoleSchema,
  lastLogin: lastLoginSchema,
  passkeyCount: z.number().int().min(0),
});

export type UserWithPasskey = z.infer<typeof userWithPasskeySchema>;

const userListSchema = z.array(userWithPasskeySchema);

export function parseUserWithPasskey(value: unknown): UserWithPasskey | null {
  const result = userWithPasskeySchema.safeParse(value);
  return result.success ? result.data : null;
}

export function parseUserWithPasskeyList(value: unknown): UserWithPasskey[] {
  const result = userListSchema.safeParse(value);
  return result.success ? result.data : [];
}

export function isUserRole(value: unknown): value is UserRole {
  return userRoleSchema.safeParse(value).success;
}
