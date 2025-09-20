import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { techniquesRouter } from "@/server/api/routers/techniques";
import { createTestContext } from "@/test/utils/context";

vi.mock("@/server/db", () => ({
  db: {
    operation: { findUnique: vi.fn() },
    technique: { update: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const { db } = await import("@/server/db");
const mockDb = vi.mocked(db, true);

describe("Techniques Router — reorder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reorders when user is creator", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR", "user-1");
    const caller = techniquesRouter.createCaller(ctx);
    mockDb.operation.findUnique.mockResolvedValue({
      id: 1,
      createdById: "user-1",
      visibility: "EVERYONE",
      accessGroups: [],
      techniques: [{ id: "a" }, { id: "b" }],
    });
    mockDb.$transaction.mockResolvedValue([]);
    const res = await caller.reorder({ operationId: 1, techniqueIds: ["b", "a"] });
    expect(res).toEqual({ success: true });
  });

  it("forbids reorder for non-creator non-admin", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR", "user-2");
    const caller = techniquesRouter.createCaller(ctx);
    mockDb.operation.findUnique.mockResolvedValue({
      id: 1,
      createdById: "user-1",
      visibility: "EVERYONE",
      accessGroups: [],
      techniques: [{ id: "a" }],
    });
    await expect(caller.reorder({ operationId: 1, techniqueIds: ["a"] })).rejects.toThrow(
      new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to modify this operation" }),
    );
  });
});
