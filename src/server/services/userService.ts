import { TRPCError } from "@trpc/server";
import type { PrismaClient, UserRole } from "@prisma/client";
import { hashPassword } from "@/server/auth/password";

export type CreateUserDTO = {
  email: string;
  name: string;
  password: string;
  role: UserRole;
  mustChangePassword: boolean;
};

export type UpdateUserDTO = {
  id: string;
  email?: string;
  name?: string;
  role?: UserRole;
  mustChangePassword?: boolean;
};

export async function createUser(db: PrismaClient, dto: CreateUserDTO) {
  const existing = await db.user.findUnique({ where: { email: dto.email } });
  if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "User with this email already exists" });

  const password = await hashPassword(dto.password);
  return db.user.create({
    data: {
      email: dto.email,
      name: dto.name,
      password,
      role: dto.role,
      mustChangePassword: dto.mustChangePassword,
    },
    select: defaultUserSelect(),
  });
}

export async function updateUser(db: PrismaClient, dto: UpdateUserDTO) {
  const { id, ...updateData } = dto;
  if (updateData.email) {
    const existing = await db.user.findFirst({ where: { email: updateData.email, id: { not: id } } });
    if (existing) throw new TRPCError({ code: "BAD_REQUEST", message: "Email is already taken by another user" });
  }

  return db.user.update({
    where: { id },
    data: updateData,
    select: defaultUserSelect(),
  });
}

export function defaultUserSelect() {
  return {
    id: true,
    name: true,
    email: true,
    role: true,
    lastLogin: true,
    twoFactorEnabled: true,
    mustChangePassword: true,
  } as const;
}

