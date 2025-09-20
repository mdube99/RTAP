import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";
import { middleware } from "@root/middleware";

vi.mock("@/server/auth", () => ({
  auth: vi.fn((handler?: unknown) => {
    if (typeof handler === "function") {
      return handler;
    }
    return Promise.resolve(null);
  }),
}));
vi.mock("@/server/db", () => ({
  db: {
    user: { findUnique: vi.fn() },
  },
}));

describe("middleware auth behavior", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 JSON for unauthenticated API request", async () => {
    const req = {
      auth: null,
      nextUrl: new URL("http://localhost/api/trpc/users"),
      url: "http://localhost/api/trpc/users",
      headers: new Headers({ accept: "application/json" }),
    } as unknown as NextRequest;

    const res = await middleware(req);
    // @ts-expect-error-nextline
    expect(res.status).toBe(401);
  });

  it("redirects HTML callers to /auth/signin", async () => {
    const req = {
      auth: null,
      nextUrl: new URL("http://localhost/operations"),
      url: "http://localhost/operations",
      headers: new Headers({ accept: "text/html" }),
    } as unknown as NextRequest;

    const res = await middleware(req);
    // redirected to /auth/signin
    // @ts-expect-error-nextline
    const location = res.headers.get("location");
    expect(location).toContain("/auth/signin");
  });

  it("redirects to change-password when hash requires reset (HTML)", async () => {
    const req = {
      auth: { user: { id: "u1", email: "e@example.com", role: "ADMIN", mustChangePassword: true } },
      nextUrl: new URL("http://localhost/operations"),
      url: "http://localhost/operations",
      headers: new Headers({ accept: "text/html" }),
    } as unknown as NextRequest;

    const res = await middleware(req);
    // @ts-expect-error-nextline
    const location = res.headers.get("location");
    expect(location).toContain("/auth/change-password");
  });

  it("returns 403 JSON when hash requires reset (API)", async () => {
    const req = {
      auth: { user: { id: "u1", email: "e@example.com", role: "ADMIN", mustChangePassword: true } },
      nextUrl: new URL("http://localhost/api/trpc/users"),
      url: "http://localhost/api/trpc/users",
      headers: new Headers({ accept: "application/json" }),
    } as unknown as NextRequest;

    const res = await middleware(req);
    // @ts-expect-error-nextline
    expect(res.status).toBe(403);
  });
});
