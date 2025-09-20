import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { techniquesRouter } from "@/server/api/routers/techniques";
import { createTestContext } from "@/test/utils/context";

vi.mock("@/server/db", () => ({
  db: {
    technique: { findUnique: vi.fn(), delete: vi.fn() },
    operation: { findUnique: vi.fn() },
  },
}));

const { db } = await import("@/server/db");
const mockDb = vi.mocked(db, true);
const baseTechnique = { id: "technique-1", operationId: 1, operation: { id: 1, createdById: "user-1" } };

describe("Techniques Router — delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.operation.findUnique.mockResolvedValue({
      id: 1,
      createdById: "user-1",
      visibility: "EVERYONE",
      accessGroups: [],
    });
  });

  it("should delete technique as creator", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR", "user-1");
    const caller = techniquesRouter.createCaller(ctx);
    mockDb.technique.findUnique.mockResolvedValue(baseTechnique);
    mockDb.technique.delete.mockResolvedValue({ id: "technique-1" });
    const res = await caller.delete({ id: "technique-1" });
    expect(res).toEqual({ id: "technique-1" });
  });

  it("should forbid delete for non-creator non-admin", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR", "user-2");
    const caller = techniquesRouter.createCaller(ctx);
    mockDb.technique.findUnique.mockResolvedValue(baseTechnique);
    await expect(caller.delete({ id: "technique-1" })).rejects.toThrow(
      new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to delete this technique" }),
    );
  });
});
