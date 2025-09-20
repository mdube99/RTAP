import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyticsRouter } from "@/server/api/routers/analytics";
import type { UserRole } from "@prisma/client";

vi.mock("@/server/db", () => ({
  db: {
    mitreTactic: { findMany: vi.fn() },
    technique: { findMany: vi.fn() },
  },
}));

const { db } = await import("@/server/db");
const mockDb = vi.mocked(db);

const createCtx = (role: UserRole = "ADMIN") => ({
  session: { user: { id: "u1", role }, expires: new Date().toISOString() },
  db: mockDb,
  headers: new Headers(),
});

describe("Analytics Coverage byTactic completeness", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all tactics zero-filled when no executions exist", async () => {
    mockDb.mitreTactic.findMany.mockResolvedValue([
      { id: "TA0001", name: "Initial Access" },
      { id: "TA0002", name: "Execution" },
      { id: "TA0003", name: "Persistence" },
    ] as any);
    mockDb.technique.findMany.mockResolvedValue([] as any);

    const caller = analyticsRouter.createCaller(createCtx());
    const result = await caller.coverage.byTactic({ start: new Date("2024-01-01"), end: new Date("2024-12-31") });

    expect(result).toHaveLength(3);
    const ids = result.map(r => r.tacticId).sort();
    expect(ids).toEqual(["TA0001", "TA0002", "TA0003"]);
    result.forEach(r => {
      expect(r.plannedCount).toBe(0);
      expect(r.executedCount).toBe(0);
      expect(r.executedAttemptCount).toBe(0);
      expect(r.detectionCount).toBe(0);
      expect(r.preventionCount).toBe(0);
      expect(r.attributionCount).toBe(0);
      expect(r.operationCount).toBe(0);
      expect(r.detectionRate).toBeNull();
      expect(r.preventionRate).toBeNull();
      expect(r.attributionRate).toBeNull();
    });
  });

  it("overlays executions onto pre-seeded tactics", async () => {
    mockDb.mitreTactic.findMany.mockResolvedValue([
      { id: "TA0001", name: "Initial Access" },
      { id: "TA0002", name: "Execution" },
    ] as any);
    mockDb.technique.findMany.mockResolvedValue([
      {
        operationId: 1,
        mitreTechniqueId: "T1566",
        startTime: new Date(),
        mitreTechnique: { tactic: { id: "TA0001", name: "Initial Access" } },
        outcomes: [
          { type: "DETECTION", status: "DETECTED" },
          { type: "PREVENTION", status: "MISSED" },
        ],
      },
      {
        operationId: 2,
        mitreTechniqueId: "T1078",
        startTime: null,
        mitreTechnique: { tactic: { id: "TA0001", name: "Initial Access" } },
        outcomes: [],
      },
    ] as any);

    const caller = analyticsRouter.createCaller(createCtx());
    const result = await caller.coverage.byTactic({ start: new Date("2024-01-01"), end: new Date("2024-12-31") });

    expect(result).toHaveLength(2);
    const init = result.find(r => r.tacticId === "TA0001")!;
    const exec = result.find(r => r.tacticId === "TA0002")!;
    expect(init.plannedCount).toBe(2);
    expect(init.executedCount).toBe(1);
    expect(init.executedAttemptCount).toBe(1);
    expect(init.operationCount).toBe(2);
    expect(init.detectionRate).toBe(100);
    expect(init.detectionCount).toBe(1);
    expect(init.preventionRate).toBe(0);
    expect(init.preventionCount).toBe(1);
    expect(exec.plannedCount).toBe(0);
    expect(exec.executedCount).toBe(0);
    expect(exec.executedAttemptCount).toBe(0);
    expect(exec.detectionCount).toBe(0);
  });

  it("orders tactics canonically with Recon/Resource first", async () => {
    mockDb.mitreTactic.findMany.mockResolvedValue([
      { id: "TA0001", name: "Initial Access" },
      { id: "TA0043", name: "Reconnaissance" },
      { id: "TA0042", name: "Resource Development" },
    ] as any);
    mockDb.technique.findMany.mockResolvedValue([] as any);

    const caller = analyticsRouter.createCaller(createCtx());
    const result = await caller.coverage.byTactic({ start: new Date("2024-01-01"), end: new Date("2024-12-31") });
    const order = result.map(r => r.tacticId);
    expect(order).toEqual(["TA0043", "TA0042", "TA0001"]);
  });

  it("counts operations where a tactic was only planned", async () => {
    mockDb.mitreTactic.findMany.mockResolvedValue([
      { id: "TA0001", name: "Initial Access" },
    ] as any);
    mockDb.technique.findMany.mockResolvedValue([
      {
        operationId: 42,
        mitreTechniqueId: "T1190",
        startTime: null,
        mitreTechnique: { tactic: { id: "TA0001", name: "Initial Access" } },
        outcomes: [],
      },
    ] as any);

    const caller = analyticsRouter.createCaller(createCtx());
    const result = await caller.coverage.byTactic({ start: new Date("2024-01-01"), end: new Date("2024-12-31") });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      tacticId: "TA0001",
      plannedCount: 1,
      executedCount: 0,
      executedAttemptCount: 0,
      operationCount: 1,
    });
  });
});
