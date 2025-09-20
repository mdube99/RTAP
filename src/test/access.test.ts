import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAccessibleOperationFilter, checkOperationAccess } from "@/server/api/access";
import type { AuthedContext } from "@/server/api/trpc";

// Build a minimal ctx with a mocked db
const makeCtx = (userId = "user-1", role: "ADMIN" | "OPERATOR" | "VIEWER" = "OPERATOR"): AuthedContext => ({
  headers: new Headers(),
  session: { user: { id: userId, role, email: "", name: "" }, expires: "2099-01-01" },
  db: {
    operation: { findUnique: vi.fn() },
  } as any,
});

describe("Access helpers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("getAccessibleOperationFilter allows EVERYONE visibility or matching group for viewers", () => {
    const ctx = makeCtx("user-1", "VIEWER");
    const where = getAccessibleOperationFilter(ctx);
    expect(where).toEqual({
      OR: [
        { visibility: "EVERYONE" },
        {
          AND: [
            { visibility: "GROUPS_ONLY" },
            { accessGroups: { some: { group: { members: { some: { userId: "user-1" } } } } } },
          ],
        },
      ],
    });
  });

  it("getAccessibleOperationFilter uses same filter for operators", () => {
    const ctx = makeCtx("user-2", "OPERATOR");
    const where = getAccessibleOperationFilter(ctx);
    expect(where).toEqual({
      OR: [
        { visibility: "EVERYONE" },
        {
          AND: [
            { visibility: "GROUPS_ONLY" },
            { accessGroups: { some: { group: { members: { some: { userId: "user-2" } } } } } },
          ],
        },
      ],
    });
  });

  it("getAccessibleOperationFilter allows all for admins", () => {
    const ctx = makeCtx("admin-1", "ADMIN");
    const where = getAccessibleOperationFilter(ctx);
    expect(where).toEqual({});
  });

  it("checkOperationAccess denies when operation is GROUPS_ONLY and user not a member", async () => {
    const ctx = makeCtx("user-1", "VIEWER");
    (ctx.db.operation.findUnique as any).mockResolvedValue({
      id: 1,
      createdById: "someone-else",
      visibility: "GROUPS_ONLY",
      accessGroups: [
        { group: { members: [] } }, // user not a member of any listed group
      ],
    });
    await expect(checkOperationAccess(ctx, 1, "view")).resolves.toBe(false);
  });

  it("checkOperationAccess allows when visibility is EVERYONE", async () => {
    const ctx = makeCtx("user-1", "VIEWER");
    (ctx.db.operation.findUnique as any).mockResolvedValue({
      id: 1,
      createdById: "someone-else",
      visibility: "EVERYONE",
      accessGroups: [],
    });
    await expect(checkOperationAccess(ctx, 1, "view")).resolves.toBe(true);
  });

  it("checkOperationAccess allows modify for operator when they have access", async () => {
    const ctx = makeCtx("user-1", "OPERATOR");
    (ctx.db.operation.findUnique as any).mockResolvedValue({
      id: 1,
      createdById: "user-1",
      visibility: "EVERYONE",
      accessGroups: [],
    });
    await expect(checkOperationAccess(ctx, 1, "modify")).resolves.toBe(true);
  });

  it("checkOperationAccess denies modify for operator when they are not creator", async () => {
    const ctx = makeCtx("user-2", "OPERATOR");
    (ctx.db.operation.findUnique as any).mockResolvedValue({
      id: 1,
      createdById: "user-1",
      visibility: "EVERYONE",
      accessGroups: [],
    });
    await expect(checkOperationAccess(ctx, 1, "modify")).resolves.toBe(false);
  });

  it("checkOperationAccess denies modify for viewer", async () => {
    const ctx = makeCtx("user-1", "VIEWER");
    (ctx.db.operation.findUnique as any).mockResolvedValue({
      id: 1,
      createdById: "other",
      visibility: "EVERYONE",
      accessGroups: [],
    });
    await expect(checkOperationAccess(ctx, 1, "modify")).resolves.toBe(false);
  });
});
