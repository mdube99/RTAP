import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { outcomesRouter } from "@/server/api/routers/outcomes";
import { createTestContext } from "@/test/utils/context";
import { buildMockOutcome } from "@/test/factories/outcome";

vi.mock("@/server/db", () => ({
  db: {
    outcome: { findUnique: vi.fn(), delete: vi.fn() },
    operation: { findUnique: vi.fn() },
  },
}));

const mockDb = (await import("@/server/db")).db as any;
const mockOutcome = buildMockOutcome();

describe("Outcomes Router — delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.operation.findUnique.mockResolvedValue({
      id: 1,
      createdById: "user-1",
      visibility: "EVERYONE",
      accessGroups: [],
    });
  });

  it("should delete outcome successfully as operation creator", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = outcomesRouter.createCaller(ctx);
    mockDb.outcome.findUnique.mockResolvedValue({
      ...mockOutcome,
      technique: { operationId: 1 },
    });
    mockDb.outcome.delete.mockResolvedValue({ id: "outcome-1" });
    const result = await caller.delete({ id: "outcome-1" });
    expect(result).toEqual({ id: "outcome-1" });
  });

  it("should delete outcome successfully as admin", async () => {
    const ctx = createTestContext(mockDb, "ADMIN");
    const caller = outcomesRouter.createCaller(ctx);
    mockDb.outcome.findUnique.mockResolvedValue({
      ...mockOutcome,
      technique: { operationId: 1 },
    });
    mockDb.outcome.delete.mockResolvedValue({ id: "outcome-1" });
    const result = await caller.delete({ id: "outcome-1" });
    expect(result).toEqual({ id: "outcome-1" });
  });

  it("should throw forbidden error for non-creator non-admin", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR", "user-2");
    const caller = outcomesRouter.createCaller(ctx);
    mockDb.outcome.findUnique.mockResolvedValue({
      ...mockOutcome,
      technique: { operationId: 1 },
    });
    await expect(caller.delete({ id: "outcome-1" })).rejects.toThrow(
      new TRPCError({ code: "FORBIDDEN", message: "You don't have permission to delete this outcome" }),
    );
  });
});
