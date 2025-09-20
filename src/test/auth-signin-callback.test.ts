import { describe, it, expect, vi } from "vitest";
import type { AdapterUser } from "next-auth/adapters";

// Mock server-only barrier and db import so config can be imported in Vitest
vi.mock('server-only', () => ({}));
vi.mock("@/server/db", () => ({ db: {} }));

describe("NextAuth signIn callback", () => {
  it("returns true; redirect handled by middleware/client when mustChangePassword is true", async () => {
    const { authConfig } = await import("@/server/auth/config");
    const user: AdapterUser & { role: string; mustChangePassword: boolean } = {
      id: "u1",
      email: "admin@example.com",
      emailVerified: null,
      name: "Admin",
      image: null,
      role: "ADMIN",
      mustChangePassword: true,
    };
    const signInCb = authConfig.callbacks?.signIn;
    if (!signInCb) throw new Error('signIn callback missing');
    const res = await signInCb({
      user,
      account: null,
      profile: undefined,
      email: undefined,
      credentials: undefined,
    });
    expect(res).toBe(true);
  });

  it("allows sign-in when mustChangePassword is false", async () => {
    const { authConfig } = await import("@/server/auth/config");
    const user: AdapterUser & { role: string; mustChangePassword: boolean } = {
      id: "u1",
      email: "admin@example.com",
      emailVerified: null,
      name: "Admin",
      image: null,
      role: "ADMIN",
      mustChangePassword: false,
    };
    const signInCb = authConfig.callbacks?.signIn;
    if (!signInCb) throw new Error('signIn callback missing');
    const res = await signInCb({
      user,
      account: null,
      profile: undefined,
      email: undefined,
      credentials: undefined,
    });
    expect(res).toBe(true);
  });
});
