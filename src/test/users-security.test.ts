import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { UserRole } from "@prisma/client";
import { usersRouter } from "@/server/api/routers/users";
import { createTestContext } from "@/test/utils/context";

vi.mock("@/server/db", () => ({
  db: {
    user: { findUnique: vi.fn(), update: vi.fn() },
  },
}));
vi.mock("@/server/auth/password", () => ({ hashPassword: vi.fn(), verifyPassword: vi.fn() }));

const mockDb = (await import("@/server/db")).db as any;
const { hashPassword, verifyPassword } = await import("@/server/auth/password");
const mockHashPassword = vi.mocked(hashPassword);
const mockVerifyPassword = vi.mocked(verifyPassword);

describe("Users Router — security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("resetPassword", () => {
    it("hashes and sets new password", async () => {
      const resetData = { id: "user-1", newPassword: "newpass123" } as const;
      mockHashPassword.mockResolvedValue("hashed");
      mockDb.user.update.mockResolvedValue({} as any);
      const ctx = createTestContext(mockDb, UserRole.ADMIN);
      const caller = usersRouter.createCaller(ctx);
      const res = await caller.resetPassword(resetData);
      expect(res).toEqual({ success: true });
    });
  });

  describe("changeOwnPassword", () => {
    it("requires correct current password and clears mustChangePassword", async () => {
      mockDb.user.findUnique.mockResolvedValue({ id: "u1", password: "hashed", mustChangePassword: true } as any);
      mockVerifyPassword.mockResolvedValue(true);
      mockHashPassword.mockResolvedValue("newhash");
      mockDb.user.update.mockResolvedValue({} as any);
      const ctx = createTestContext(mockDb, UserRole.OPERATOR, "u1");
      const caller = usersRouter.createCaller(ctx);
      const res = await caller.changeOwnPassword({ currentPassword: "current1", newPassword: "nextpass" });
      expect(res.success).toBe(true);
    });
  });

  describe("adminDisableTotp", () => {
    it("removes TOTP for specified user", async () => {
      mockDb.user.update.mockResolvedValue({} as any);
      const ctx = createTestContext(mockDb, UserRole.ADMIN);
      const caller = usersRouter.createCaller(ctx);
      const res = await caller.adminDisableTotp({ id: "u1" });
      expect(res).toEqual({ success: true });
    });

    it("rejects non-admin users", async () => {
      const ctx = createTestContext(mockDb, UserRole.VIEWER);
      const caller = usersRouter.createCaller(ctx);
      await expect(caller.adminDisableTotp({ id: "u1" })).rejects.toThrow(
        new TRPCError({ code: "FORBIDDEN", message: "Admin access required" }),
      );
    });
  });
});
