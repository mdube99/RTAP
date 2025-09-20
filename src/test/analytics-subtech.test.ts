import { describe, it, expect, vi, beforeEach } from "vitest";
import { analyticsRouter } from "@/server/api/routers/analytics";
import type { UserRole } from "@prisma/client";
import { OutcomeStatus, OutcomeType } from "@prisma/client";

vi.mock("@/server/db", () => ({
  db: {
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

describe("Analytics Sub-techniques", () => {
  beforeEach(() => vi.clearAllMocks());

  it("subTechniqueUsage returns only executed sub-techniques", async () => {
    mockDb.technique.findMany
      // First call: DB already filters by startTime != null; return executed only
      .mockResolvedValueOnce([
        { mitreSubTechniqueId: "T1000.001", startTime: new Date() },
      ] as any);

    const caller = analyticsRouter.createCaller(createCtx());
    const used = await caller.coverage.subTechniqueUsage();

    const ids = used.map(u => u.subTechniqueId);
    expect(ids).toContain("T1000.001");
    expect(ids).not.toContain("T1000.002");
  });

  it("subTechniqueMetrics sets availability flags and rates only when attempts exist", async () => {
    // One executed sub-technique with a DETECTED detection, MISSED prevention, N/A attribution
    mockDb.technique.findMany
      .mockResolvedValueOnce([
        {
          mitreSubTechniqueId: "T2000.001",
          startTime: new Date(),
          mitreSubTechnique: {
            id: "T2000.001",
            name: "Sub A",
            techniqueId: "T2000",
            technique: { name: "Base", tactic: { id: "TA0001", name: "Initial Access" } },
          },
          outcomes: [
            { type: OutcomeType.DETECTION, status: OutcomeStatus.DETECTED },
            { type: OutcomeType.PREVENTION, status: OutcomeStatus.MISSED },
            { type: OutcomeType.ATTRIBUTION, status: OutcomeStatus.NOT_APPLICABLE },
          ],
        },
      ] as any);

    const caller = analyticsRouter.createCaller(createCtx());
    const subMetrics = await caller.coverage.subTechniqueMetrics();
    expect(subMetrics).toHaveLength(1);
    const m = subMetrics[0]! as any;
    expect(m.subTechniqueId).toBe("T2000.001");
    expect(m.detectionAvailable).toBe(true);
    expect(m.preventionAvailable).toBe(true);
    expect(m.attributionAvailable).toBe(false);
    expect(m.detectionRate).toBe(100);
    expect(m.preventionRate).toBe(0);
    expect(m.attributionRate).toBe(0);
  });
});
