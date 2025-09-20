import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { outcomesRouter } from "@/server/api/routers/outcomes";
import { createTestContext } from "@/test/utils/context";
import { buildCreateOutcomeData, buildMockOutcome } from "@/test/factories/outcome";

vi.mock("@/server/db", () => ({
  db: {
    outcome: { create: vi.fn() },
    technique: { findMany: vi.fn() },
    operation: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const mockDb = (await import("@/server/db")).db as any;
const mockOutcome = buildMockOutcome();

describe("Outcomes Router — bulkCreate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create multiple outcomes in transaction", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = outcomesRouter.createCaller(ctx);
    const bulkData = [
      buildCreateOutcomeData({ techniqueId: "technique-1" }),
      buildCreateOutcomeData({ techniqueId: "technique-2" }),
    ];
    mockDb.technique.findMany.mockResolvedValue([
      { id: "technique-1", operationId: 1 },
      { id: "technique-2", operationId: 2 },
    ]);
    mockDb.operation.findUnique.mockImplementation(async ({ where }: { where: { id: number } }) => ({
      id: where.id,
      createdById: "user-1",
      visibility: "EVERYONE",
      accessGroups: [],
    }));
    mockDb.$transaction.mockImplementation(async (ops: any[]) => ops.map(() => mockOutcome));
    const result = await caller.bulkCreate({ outcomes: bulkData });
    expect(result).toHaveLength(2);
  });

  it("should throw error if techniques not found", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = outcomesRouter.createCaller(ctx);
    const bulkData = [
      buildCreateOutcomeData({ techniqueId: "technique-1" }),
      buildCreateOutcomeData({ techniqueId: "technique-2" }),
    ];
    mockDb.technique.findMany.mockResolvedValue([]);
    await expect(caller.bulkCreate({ outcomes: bulkData })).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "One or more techniques not found" }),
    );
  });
});
