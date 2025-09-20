import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { UserRole } from "@prisma/client";
import { usersRouter } from "@/server/api/routers/users";
import { createTestContext } from "@/test/utils/context";

vi.mock("@/server/db", () => ({
  db: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock("@/server/auth/login-link", () => ({
  LOGIN_LINK_PROVIDER_ID: "login-link",
  createLoginLink: vi.fn().mockResolvedValue({
    url: "https://app/api/auth/callback/login-link?token=abc",
    expires: new Date("2025-01-01T00:00:00Z"),
  }),
}));

const { db } = await import("@/server/db");
const mockDb = vi.mocked(db, true);
const { createLoginLink } = await import("@/server/auth/login-link");
const mockCreateLoginLink = vi.mocked(createLoginLink);

describe("Users Router — login links", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("issues login link for existing user", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "u1", email: "user@test.com", name: "User" });
    const ctx = createTestContext(mockDb, UserRole.ADMIN);
    const caller = usersRouter.createCaller(ctx);
    const res = await caller.issueLoginLink({ id: "u1" });
    expect(res.url).toContain("token=abc");
    expect(mockCreateLoginLink).toHaveBeenCalledWith(mockDb, { email: "user@test.com" });
  });

  it("throws when user not found", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    const ctx = createTestContext(mockDb, UserRole.ADMIN);
    const caller = usersRouter.createCaller(ctx);
    await expect(caller.issueLoginLink({ id: "missing" })).rejects.toThrow(new TRPCError({ code: "NOT_FOUND", message: "User not found" }));
  });
});
