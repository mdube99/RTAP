import { describe, it, expect, vi } from "vitest";
import type { AdapterUser } from "next-auth/adapters";

// Mock server-only barrier and db import so config can be imported in Vitest
vi.mock("server-only", () => ({}));
vi.mock("@/server/db", () => ({ db: { user: { findUnique: vi.fn() } } }));

const mockDb = (await import("@/server/db")).db as any;

describe("NextAuth signIn callback", () => {
  it("allows calls without account context", async () => {
    const { authConfig } = await import("@/server/auth/config");
    const signInCb = authConfig.callbacks?.signIn;
    if (!signInCb) throw new Error("signIn callback missing");
    const result = await signInCb({ account: null, user: {} as AdapterUser });
    expect(result).toBe(true);
  });

  it("denies passkey sign-in when passkeys are disabled", async () => {
    const { authConfig } = await import("@/server/auth/config");
    const signInCb = authConfig.callbacks?.signIn;
    if (!signInCb) throw new Error("signIn callback missing");
    const res = await signInCb({
      account: { provider: "passkey" } as any,
      user: { id: "u1", email: "user@test.com" } as AdapterUser,
    });
    expect(res).toBe(false);
  });

  it("allows login link when user exists", async () => {
    mockDb.user.findUnique.mockResolvedValue({ id: "u1", email: "user@test.com", role: "ADMIN" });
    const { authConfig } = await import("@/server/auth/config");
    const signInCb = authConfig.callbacks?.signIn;
    if (!signInCb) throw new Error("signIn callback missing");
    const res = await signInCb({
      account: { provider: "login-link" } as any,
      user: { email: "user@test.com" } as AdapterUser,
    });
    expect(res).toBe(true);
  });
});
