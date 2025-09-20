import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { UserRole } from "@prisma/client";
import { usersRouter } from "@/server/api/routers/users";
import { createTestContext } from "@/test/utils/context";

vi.mock("@/server/db", () => ({
  db: {
    user: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/server/auth/login-link", () => ({
  LOGIN_LINK_PROVIDER_ID: "login-link",
  createLoginLink: vi.fn().mockResolvedValue({
    url: "https://app/auth/callback/login-link?token=abc",
    expires: new Date("2025-01-01T00:00:00Z"),
  }),
}));

const mockDb = (await import("@/server/db")).db as any;
const { createLoginLink } = await import("@/server/auth/login-link");
const mockCreateLoginLink = vi.mocked(createLoginLink);

describe("Users Router — create & validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates new user and returns login link", async () => {
    const newUserData = { email: "newuser@test.com", name: "New User", role: UserRole.OPERATOR } as const;
    const mockCreatedUser = {
      id: "new-user-id",
      name: newUserData.name,
      email: newUserData.email,
      role: newUserData.role,
      lastLogin: null,
      _count: { authenticators: 0 },
    };
    mockDb.user.findUnique.mockResolvedValue(null);
    mockDb.user.create.mockResolvedValue(mockCreatedUser);
    const ctx = createTestContext(mockDb, UserRole.ADMIN);
    const caller = usersRouter.createCaller(ctx);
    const result = await caller.create(newUserData);

    expect(result.user).toEqual({
      id: "new-user-id",
      name: "New User",
      email: "newuser@test.com",
      role: UserRole.OPERATOR,
      lastLogin: null,
      passkeyCount: 0,
    });
    expect(result.loginLink.url).toContain("token=abc");
    expect(mockCreateLoginLink).toHaveBeenCalledWith(mockDb, { email: newUserData.email });
  });

  it("throws when email already exists", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "existing", email: "existing@test.com" });
    const ctx = createTestContext(mockDb, UserRole.ADMIN);
    const caller = usersRouter.createCaller(ctx);
    await expect(caller.create({ email: "existing@test.com", name: "Test", role: UserRole.VIEWER })).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "User with this email already exists" }),
    );
  });

  it("defaults role to VIEWER", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    mockDb.user.create.mockResolvedValue({
      id: "u",
      name: "Test",
      email: "test@test.com",
      role: UserRole.VIEWER,
      lastLogin: null,
      _count: { authenticators: 0 },
    });
    const ctx = createTestContext(mockDb, UserRole.ADMIN);
    const caller = usersRouter.createCaller(ctx);
    await caller.create({ email: "test@test.com", name: "Test User" });
    expect(mockDb.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ role: UserRole.VIEWER }) }));
  });

  it("validates email format", async () => {
    const ctx = createTestContext(mockDb, UserRole.ADMIN);
    const caller = usersRouter.createCaller(ctx);
    await expect(caller.create({ email: "bad", name: "Test" })).rejects.toThrow();
  });

  it("validates minimum name length", async () => {
    const ctx = createTestContext(mockDb, UserRole.ADMIN);
    const caller = usersRouter.createCaller(ctx);
    await expect(caller.create({ email: "t@test.com", name: "" })).rejects.toThrow();
  });
});
