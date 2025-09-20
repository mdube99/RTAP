import type { UserRole } from "@prisma/client";

export function buildOperation(overrides: Partial<{ id: number; name: string; createdById: string }> = {}) {
  return {
    id: overrides.id ?? 1,
    name: overrides.name ?? "Test Operation",
    createdById: overrides.createdById ?? "user-1",
  };
}

export function buildUser(overrides: Partial<{ id: string; role: UserRole; email: string; name: string }> = {}) {
  return {
    id: overrides.id ?? "user-1",
    role: overrides.role ?? ("OPERATOR" as UserRole),
    email: overrides.email ?? "test@example.com",
    name: overrides.name ?? "Test User",
  };
}

