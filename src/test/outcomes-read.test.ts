import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { outcomesRouter } from "@/server/api/routers/outcomes";
import { createTestContext } from "@/test/utils/context";
import { buildMockOutcome } from "@/test/factories/outcome";

vi.mock("@/server/db", () => ({
  db: {
    outcome: { findFirst: vi.fn(), findMany: vi.fn() },
    userGroup: { findMany: vi.fn() },
    group: { findMany: vi.fn() },
  },
}));

const mockDb = (await import("@/server/db")).db as any;
const mockOutcome = buildMockOutcome();

describe("Outcomes Router — read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.userGroup.findMany.mockResolvedValue([]);
  });

  describe("getById", () => {
    it("should return outcome by ID", async () => {
      const ctx = createTestContext(mockDb, "OPERATOR");
      const caller = outcomesRouter.createCaller(ctx);
      mockDb.outcome.findFirst.mockResolvedValue(mockOutcome);
      const result = await caller.getById({ id: "outcome-1" });
      expect(result).toEqual(mockOutcome);
    });

    it("should throw error if outcome not found", async () => {
      const ctx = createTestContext(mockDb, "OPERATOR");
      const caller = outcomesRouter.createCaller(ctx);
      mockDb.outcome.findFirst.mockResolvedValue(null);
      await expect(caller.getById({ id: "nonexistent" })).rejects.toThrow(
        new TRPCError({ code: "NOT_FOUND", message: "Outcome not found" }),
      );
    });
  });

  describe("list", () => {
    it("should list outcomes with filtering", async () => {
      const ctx = createTestContext(mockDb, "OPERATOR");
      const caller = outcomesRouter.createCaller(ctx);
      const mockOutcomes = [mockOutcome];
      mockDb.outcome.findMany.mockResolvedValue(mockOutcomes);
      const result = await caller.list({ techniqueId: "technique-1", type: "DETECTION", status: "DETECTED" });
      expect(result.outcomes).toEqual(mockOutcomes);
      expect(result.nextCursor).toBeUndefined();
    });

    it("should filter by operation ID", async () => {
      const ctx = createTestContext(mockDb, "OPERATOR");
      const caller = outcomesRouter.createCaller(ctx);
      mockDb.outcome.findMany.mockResolvedValue([]);
      await caller.list({ operationId: 1 });
      expect(mockDb.outcome.findMany).toHaveBeenCalled();
    });

    it("should handle pagination", async () => {
      const ctx = createTestContext(mockDb, "OPERATOR");
      const caller = outcomesRouter.createCaller(ctx);
      const outcomes = Array.from({ length: 11 }, (_, i) => ({ ...mockOutcome, id: `outcome-${i}` }));
      mockDb.outcome.findMany.mockResolvedValue(outcomes);
      const result = await caller.list({ limit: 10, cursor: "outcome-5" });
      expect(result.outcomes).toHaveLength(10);
      expect(result.nextCursor).toBe("outcome-10");
    });
  });
});

