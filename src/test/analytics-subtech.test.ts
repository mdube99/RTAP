import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyticsRouter } from "@/server/api/routers/analytics";
import { OutcomeStatus, OutcomeType, type UserRole } from "@prisma/client";
import { buildCoverageOutcome, buildTechniqueWithSubTechnique } from "./factories/analytics";

vi.mock("@/server/db", () => ({
  db: {
    technique: { findMany: vi.fn() },
  },
}));

const { db } = await import("@/server/db");
const mockDb = vi.mocked(db, true);

const createCtx = (role: UserRole = "ADMIN") => ({
  session: { user: { id: "u1", role }, expires: new Date().toISOString() },
  db: mockDb,
  headers: new Headers(),
  requestId: "analytics-subtech-test",
});

describe("Analytics Sub-techniques", () => {
  beforeEach(() => vi.clearAllMocks());

  it("subTechniqueUsage returns only executed sub-techniques", async () => {
    const executed: Array<{ mitreSubTechniqueId: string | null; startTime: Date | null }> = [
      { mitreSubTechniqueId: "T1000.001", startTime: new Date() },
    ];
    mockDb.technique.findMany.mockResolvedValueOnce(executed);

    const caller = analyticsRouter.createCaller(createCtx());
    const used = await caller.coverage.subTechniqueUsage();

    const ids = used.map((u) => u.subTechniqueId);
    expect(ids).toContain("T1000.001");
    expect(ids).not.toContain("T1000.002");
  });

  it("subTechniqueMetrics sets availability flags and rates only when attempts exist", async () => {
    const techniqueId = "tech-1";
    const metricsTechnique = buildTechniqueWithSubTechnique({
      id: techniqueId,
      mitreSubTechniqueId: "T2000.001",
      startTime: new Date(),
      mitreSubTechnique: {
        id: "T2000.001",
        name: "Sub A",
        techniqueId: "T2000",
        technique: {
          id: "T2000",
          name: "Base",
          tactic: { id: "TA0001", name: "Initial Access" },
        },
      },
      outcomes: [
        buildCoverageOutcome(techniqueId, { type: OutcomeType.DETECTION, status: OutcomeStatus.DETECTED }),
        buildCoverageOutcome(techniqueId, { type: OutcomeType.PREVENTION, status: OutcomeStatus.MISSED }),
        buildCoverageOutcome(techniqueId, { type: OutcomeType.ATTRIBUTION, status: OutcomeStatus.NOT_APPLICABLE }),
      ],
    });

    mockDb.technique.findMany.mockResolvedValueOnce([metricsTechnique]);

    const caller = analyticsRouter.createCaller(createCtx());
    const subMetrics = await caller.coverage.subTechniqueMetrics();
    expect(subMetrics).toHaveLength(1);
    const m = subMetrics[0]!;
    expect(m.subTechniqueId).toBe("T2000.001");
    expect(m.detectionAvailable).toBe(true);
    expect(m.preventionAvailable).toBe(true);
    expect(m.attributionAvailable).toBe(false);
    expect(m.detectionRate).toBe(100);
    expect(m.preventionRate).toBe(0);
    expect(m.attributionRate).toBe(0);
  });
});
