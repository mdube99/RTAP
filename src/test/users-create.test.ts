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

vi.mock("@/server/auth/password", () => ({ hashPassword: vi.fn(), verifyPassword: vi.fn() }));

const mockDb = (await import("@/server/db")).db as any;
const { hashPassword } = await import("@/server/auth/password");
const mockHashPassword = vi.mocked(hashPassword);

describe("Users Router — create & validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates new user with hashed password", async () => {
    const newUserData = { email: "newuser@test.com", name: "New User", password: "password123", role: UserRole.OPERATOR, mustChangePassword: true };
    const hashedPassword = "hashed-password-123";
    const mockCreatedUser = { id: "new-user-id", name: newUserData.name, email: newUserData.email, role: newUserData.role, lastLogin: null, twoFactorEnabled: false, mustChangePassword: true };
    mockDb.user.findUnique.mockResolvedValue(null);
    mockHashPassword.mockResolvedValue(hashedPassword);
    mockDb.user.create.mockResolvedValue(mockCreatedUser);
    const ctx = createTestContext(mockDb, UserRole.ADMIN);
    const caller = usersRouter.createCaller(ctx);
    const result = await caller.create(newUserData);
    expect(result).toEqual(mockCreatedUser);
  });

  it("throws when email already exists", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "existing", email: "existing@test.com" });
    const ctx = createTestContext(mockDb, UserRole.ADMIN);
    const caller = usersRouter.createCaller(ctx);
    await expect(caller.create({ email: "existing@test.com", name: "Test", password: "password123", role: UserRole.VIEWER })).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "User with this email already exists" }),
    );
  });

  it("defaults role to VIEWER", async () => {
    mockDb.user.findUnique.mockResolvedValue(null);
    mockHashPassword.mockResolvedValue("hashed");
    mockDb.user.create.mockResolvedValue({ id: "u", name: "Test", email: "test@test.com", role: UserRole.VIEWER });
    const ctx = createTestContext(mockDb, UserRole.ADMIN);
    const caller = usersRouter.createCaller(ctx);
    await caller.create({ email: "test@test.com", name: "Test User", password: "password123" });
    expect(mockDb.user.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ role: UserRole.VIEWER }) }));
  });

  it("validates email format", async () => {
    const ctx = createTestContext(mockDb, UserRole.ADMIN);
    const caller = usersRouter.createCaller(ctx);
    await expect(caller.create({ email: "bad", name: "Test", password: "password123", role: UserRole.VIEWER })).rejects.toThrow();
  });

  it("validates minimum password length", async () => {
    const ctx = createTestContext(mockDb, UserRole.ADMIN);
    const caller = usersRouter.createCaller(ctx);
    await expect(caller.create({ email: "t@test.com", name: "Test", password: "123", role: UserRole.VIEWER })).rejects.toThrow();
  });

  it("validates minimum name length", async () => {
    const ctx = createTestContext(mockDb, UserRole.ADMIN);
    const caller = usersRouter.createCaller(ctx);
    await expect(caller.create({ email: "t@test.com", name: "", password: "password123", role: UserRole.VIEWER })).rejects.toThrow();
  });
});

