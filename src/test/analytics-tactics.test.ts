import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyticsRouter } from "@/server/api/routers/analytics";
import { OutcomeStatus, OutcomeType, type Prisma, type UserRole } from "@prisma/client";
import {
  buildCoverageOutcome,
  buildCoverageTechnique,
  buildMitreTactic,
  type CoverageTechnique,
} from "./factories/analytics";

const { mitreTacticFindMany, techniqueFindMany } = vi.hoisted(() => ({
  mitreTacticFindMany: vi.fn<[], Promise<Prisma.MitreTactic[]>>(),
  techniqueFindMany: vi.fn<[], Promise<CoverageTechnique[]>>(),
}));

vi.mock("@/server/db", () => ({
  db: {
    mitreTactic: { findMany: mitreTacticFindMany },
    technique: { findMany: techniqueFindMany },
  },
}));

const { db } = await import("@/server/db");
const mockDb = vi.mocked(db, true);

const createCtx = (role: UserRole = "ADMIN") => ({
  session: { user: { id: "u1", role }, expires: new Date().toISOString() },
  db: mockDb,
  headers: new Headers(),
  requestId: "analytics-tactics-test",
});

describe("Analytics Coverage byTactic completeness", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns all tactics zero-filled when no executions exist", async () => {
    const tactics: Prisma.MitreTactic[] = [
      buildMitreTactic({ id: "TA0001", name: "Initial Access" }),
      buildMitreTactic({ id: "TA0002", name: "Execution" }),
      buildMitreTactic({ id: "TA0003", name: "Persistence" }),
    ];
    mitreTacticFindMany.mockResolvedValue(tactics);
    const techniques: CoverageTechnique[] = [];
    mockDb.technique.findMany.mockResolvedValue(techniques);

    const caller = analyticsRouter.createCaller(createCtx());
    const result = await caller.coverage.byTactic({ start: new Date("2024-01-01"), end: new Date("2024-12-31") });

    expect(result).toHaveLength(3);
    const ids = result.map((r) => r.tacticId).sort();
    expect(ids).toEqual(["TA0001", "TA0002", "TA0003"]);
    result.forEach((r) => {
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
    const tactics: Prisma.MitreTactic[] = [
      buildMitreTactic({ id: "TA0001", name: "Initial Access" }),
      buildMitreTactic({ id: "TA0002", name: "Execution" }),
    ];
    mitreTacticFindMany.mockResolvedValue(tactics);

    const executedTechnique = buildCoverageTechnique({
      id: "tech-1",
      operationId: 1,
      mitreTechniqueId: "T1566",
      startTime: new Date(),
      mitreTechnique: {
        tactic: buildMitreTactic({ id: "TA0001", name: "Initial Access" }),
      },
      outcomes: [
        buildCoverageOutcome("tech-1", { type: OutcomeType.DETECTION, status: OutcomeStatus.DETECTED }),
        buildCoverageOutcome("tech-1", { type: OutcomeType.PREVENTION, status: OutcomeStatus.MISSED }),
      ],
    });

    const plannedTechnique = buildCoverageTechnique({
      id: "tech-2",
      operationId: 2,
      mitreTechniqueId: "T1078",
      startTime: null,
      mitreTechnique: {
        id: "T1078",
        tacticId: "TA0001",
        tactic: buildMitreTactic({ id: "TA0001", name: "Initial Access" }),
      },
      outcomes: [],
    });

    const techniqueResults: CoverageTechnique[] = [executedTechnique, plannedTechnique];
    mockDb.technique.findMany.mockResolvedValue(techniqueResults);

    const caller = analyticsRouter.createCaller(createCtx());
    const result = await caller.coverage.byTactic({ start: new Date("2024-01-01"), end: new Date("2024-12-31") });

    expect(result).toHaveLength(2);
    const init = result.find((r) => r.tacticId === "TA0001")!;
    const exec = result.find((r) => r.tacticId === "TA0002")!;
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
    const tactics: Prisma.MitreTactic[] = [
      buildMitreTactic({ id: "TA0001", name: "Initial Access" }),
      buildMitreTactic({ id: "TA0043", name: "Reconnaissance" }),
      buildMitreTactic({ id: "TA0042", name: "Resource Development" }),
    ];
    mitreTacticFindMany.mockResolvedValue(tactics);
    const techniques: CoverageTechnique[] = [];
    mockDb.technique.findMany.mockResolvedValue(techniques);

    const caller = analyticsRouter.createCaller(createCtx());
    const result = await caller.coverage.byTactic({ start: new Date("2024-01-01"), end: new Date("2024-12-31") });
    const order = result.map((r) => r.tacticId);
    expect(order).toEqual(["TA0043", "TA0042", "TA0001"]);
  });

  it("counts operations where a tactic was only planned", async () => {
    const tactics: Prisma.MitreTactic[] = [buildMitreTactic({ id: "TA0001", name: "Initial Access" })];
    mitreTacticFindMany.mockResolvedValue(tactics);
    const plannedOnly = buildCoverageTechnique({
      id: "tech-3",
      operationId: 42,
      mitreTechniqueId: "T1190",
      startTime: null,
      mitreTechnique: {
        id: "T1190",
        tactic: buildMitreTactic({ id: "TA0001", name: "Initial Access" }),
      },
      outcomes: [],
    });
    const plannedTechniques: CoverageTechnique[] = [plannedOnly];
    mockDb.technique.findMany.mockResolvedValue(plannedTechniques);

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
