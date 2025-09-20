import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { outcomesRouter } from "@/server/api/routers/outcomes";
import type { OutcomeType, OutcomeStatus } from "@prisma/client";
import { createTestContext } from "@/test/utils/context";
import { buildCreateOutcomeData, buildMockOutcome } from "@/test/factories/outcome";
import { buildTechnique } from "@/test/factories/technique";

// Mock database
vi.mock("@/server/db", () => ({
  db: {
    outcome: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    technique: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    tool: {
      findMany: vi.fn(),
    },
    logSource: {
      findMany: vi.fn(),
    },
    operation: { findUnique: vi.fn() },
    userGroup: { findMany: vi.fn() },
    group: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const mockDb = (await import("@/server/db")).db as any;
const createOutcomeData = buildCreateOutcomeData();
const mockOutcome = buildMockOutcome();
const mockTechnique = buildTechnique({ id: "technique-1" });

describe("Outcomes Router — create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.userGroup.findMany.mockResolvedValue([]);
    mockDb.group.findMany.mockResolvedValue([]);
    mockDb.operation.findUnique.mockResolvedValue({
      id: 1,
      createdById: "user-1",
      visibility: "EVERYONE",
      accessGroups: [],
    });
  });

  it("should create outcome successfully", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = outcomesRouter.createCaller(ctx);

    mockDb.technique.findUnique.mockResolvedValue({ operationId: mockTechnique.operationId });
    mockDb.tool.findMany.mockResolvedValue([{ id: "tool-1", name: "CrowdStrike Falcon" }]);
    mockDb.logSource.findMany.mockResolvedValue([{ id: "log-source-1", name: "Windows Event Log" }]);
    mockDb.outcome.create.mockResolvedValue(mockOutcome);

    const result = await caller.create(createOutcomeData);
    expect(result).toEqual(mockOutcome);
  });

  it("should throw error if technique not found", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = outcomesRouter.createCaller(ctx);
    mockDb.technique.findUnique.mockResolvedValue(null);
    await expect(caller.create(createOutcomeData)).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "Technique not found" }),
    );
  });

  it("should throw error if tools not found", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = outcomesRouter.createCaller(ctx);
    mockDb.technique.findUnique.mockResolvedValue({ operationId: mockTechnique.operationId });
    mockDb.tool.findMany.mockResolvedValue([]);
    await expect(caller.create(createOutcomeData)).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "One or more tools not found" }),
    );
  });

  it("should throw error if log sources not found", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = outcomesRouter.createCaller(ctx);
    mockDb.technique.findUnique.mockResolvedValue({ operationId: mockTechnique.operationId });
    mockDb.tool.findMany.mockResolvedValue([{ id: "tool-1", name: "CrowdStrike Falcon" }]);
    mockDb.logSource.findMany.mockResolvedValue([]);
    await expect(caller.create(createOutcomeData)).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "One or more log sources not found" }),
    );
  });

  it("should throw error if detection time missing for detected status", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = outcomesRouter.createCaller(ctx);
    const invalidData = { techniqueId: "technique-1", type: "DETECTION" as OutcomeType, status: "DETECTED" as OutcomeStatus };
    mockDb.technique.findUnique.mockResolvedValue({ operationId: mockTechnique.operationId });
    await expect(caller.create(invalidData)).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "Timestamp is required for detected/attributed outcomes" }),
    );
  });

  it("should NOT require time for prevented status", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = outcomesRouter.createCaller(ctx);
    const invalidData = { techniqueId: "technique-1", type: "PREVENTION" as OutcomeType, status: "PREVENTED" as OutcomeStatus };
    mockDb.technique.findUnique.mockResolvedValue({ operationId: mockTechnique.operationId });
    mockDb.outcome.create.mockResolvedValue({ id: "outcome-1" });
    await expect(caller.create(invalidData)).resolves.toBeDefined();
  });

  it("should throw error if detection time missing for attributed status", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = outcomesRouter.createCaller(ctx);
    const invalidData = { techniqueId: "technique-1", type: "ATTRIBUTION" as OutcomeType, status: "ATTRIBUTED" as OutcomeStatus };
    mockDb.technique.findUnique.mockResolvedValue(mockTechnique);
    await expect(caller.create(invalidData)).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "Timestamp is required for detected/attributed outcomes" }),
    );
  });

  it("should create outcome without optional fields", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = outcomesRouter.createCaller(ctx);
    const minimalData = { techniqueId: "technique-1", type: "DETECTION" as OutcomeType, status: "MISSED" as OutcomeStatus };
    mockDb.technique.findUnique.mockResolvedValue(mockTechnique);
    const minimalOutcome = {
      ...mockOutcome,
      status: "MISSED" as OutcomeStatus,
      detectionTime: null,
      notes: null,
      screenshotUrl: null,
      logData: null,
      tools: [],
      logSources: [],
    };
    mockDb.outcome.create.mockResolvedValue(minimalOutcome);
    const result = await caller.create(minimalData);
    expect(result).toEqual(minimalOutcome);
  });
});
