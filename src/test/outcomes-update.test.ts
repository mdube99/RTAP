import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { outcomesRouter } from "@/server/api/routers/outcomes";
import type { OutcomeStatus } from "@prisma/client";
import { createTestContext } from "@/test/utils/context";
import { buildMockOutcome } from "@/test/factories/outcome";

vi.mock("@/server/db", () => ({
  db: {
    outcome: { findUnique: vi.fn(), update: vi.fn() },
    tool: { findMany: vi.fn() },
    operation: { findUnique: vi.fn() },
  },
}));

const mockDb = (await import("@/server/db")).db as any;
const mockOutcome = buildMockOutcome();

describe("Outcomes Router — update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.operation.findUnique.mockResolvedValue({
      id: 1,
      createdById: "user-1",
      visibility: "EVERYONE",
      accessGroups: [],
    });
  });

  it("should update outcome successfully", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = outcomesRouter.createCaller(ctx);

    mockDb.outcome.findUnique.mockResolvedValue({
      ...mockOutcome,
      technique: {
        operationId: 1,
      },
    });
    mockDb.tool.findMany.mockResolvedValue([{ id: "tool-2", name: "Splunk" }]);
    const updatedOutcome = { ...mockOutcome, status: "PREVENTED" as OutcomeStatus, notes: "Updated notes" };
    mockDb.outcome.update.mockResolvedValue(updatedOutcome);

    const result = await caller.update({ id: "outcome-1", status: "PREVENTED", notes: "Updated notes", toolIds: ["tool-2"] });
    expect(result).toEqual(updatedOutcome);
  });

  it("should throw error if outcome not found", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = outcomesRouter.createCaller(ctx);
    mockDb.outcome.findUnique.mockResolvedValue(null);
    await expect(caller.update({ id: "nonexistent", status: "DETECTED" })).rejects.toThrow(
      new TRPCError({ code: "NOT_FOUND", message: "Outcome not found" }),
    );
  });

  it("should throw error if detection time required but missing", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = outcomesRouter.createCaller(ctx);
    const existingOutcome = { ...mockOutcome, status: "DETECTED" as OutcomeStatus, detectionTime: null };
    mockDb.outcome.findUnique.mockResolvedValue({
      ...existingOutcome,
      technique: { operationId: 1 },
    });
    await expect(caller.update({ id: "outcome-1", status: "DETECTED" as OutcomeStatus })).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "Timestamp is required for detected/attributed outcomes" }),
    );
  });
});
