import "@testing-library/jest-dom";
import { beforeEach, vi } from "vitest";
import type { UserRole } from "@prisma/client";

// Mock NextAuth
vi.mock("next-auth", () => ({
  default: vi.fn(() => ({
    auth: vi.fn(),
    handlers: { GET: vi.fn(), POST: vi.fn() },
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn(() => ({
    id: "credentials",
    name: "credentials",
    type: "credentials",
    authorize: vi.fn(),
  })),
}));

// Prisma is mocked in individual test files

// Mock environment variables
vi.mock("@/env", () => ({
  env: {
    DATABASE_URL: "file:./test.db",
    AUTH_SECRET: "test-secret",
  },
}));

// Mock context helper function
export const createMockContext = (userRole: UserRole = "ADMIN", userId = "user-1") => ({
  headers: new Headers(),
  session: {
    user: {
      id: userId,
      role: userRole,
      email: "test@example.com",
      name: "Test User",
    },
    expires: "2030-01-01",
  },
  db: {} as any, // Will be replaced by individual test mocks
});

// Ensure mocks are cleared between tests globally
beforeEach(() => {
  vi.clearAllMocks();
});
