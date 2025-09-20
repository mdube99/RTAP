import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole, OutcomeStatus, OutcomeType } from "@prisma/client";
import { analyticsRouter } from "@/server/api/routers/analytics";

// Mock database
vi.mock("@/server/db", () => ({
  db: {
    technique: {
      findMany: vi.fn(),
    },
    mitreTechnique: {
      findMany: vi.fn(),
    },
    operation: {
      findMany: vi.fn(),
    },
  },
}));

const { db } = await import("@/server/db");
const mockDb = vi.mocked(db, true);

// Helper to create mock context
const createMockContext = (userRole: UserRole = UserRole.ADMIN, userId = "test-user-id") => ({
  session: {
    user: { id: userId, role: userRole },
    expires: new Date().toISOString(),
  },
  db: mockDb,
  headers: new Headers(),
  requestId: "analytics-test",
});

describe("Analytics Procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTechniqueMetrics", () => {
    it("should return comprehensive technique metrics for MITRE ATT&CK coverage", async () => {
      // Mock MITRE techniques data
      const mockMitreTechniques = [
        {
          id: "T1566",
          name: "Phishing",
          tactic: { id: "TA0001", name: "Initial Access" },
        },
        {
          id: "T1059",
          name: "Command and Scripting Interpreter",
          tactic: { id: "TA0002", name: "Execution" },
        },
      ];

      // Mock executed techniques with outcomes
      const mockExecutedTechniques = [
        {
          id: "tech1",
          mitreTechnique: {
            id: "T1566",
            name: "Phishing",
            tactic: { id: "TA0001", name: "Initial Access" },
          },
          operation: { id: "op1", name: "Test Op", status: "COMPLETED" },
          outcomes: [
            { type: OutcomeType.DETECTION, status: OutcomeStatus.DETECTED },
            { type: OutcomeType.PREVENTION, status: OutcomeStatus.MISSED },
            { type: OutcomeType.ATTRIBUTION, status: OutcomeStatus.ATTRIBUTED },
          ],
        },
        {
          id: "tech2", 
          mitreTechnique: {
            id: "T1566",
            name: "Phishing",
            tactic: { id: "TA0001", name: "Initial Access" },
          },
          operation: { id: "op2", name: "Test Op 2", status: "COMPLETED" },
          outcomes: [
            { type: OutcomeType.DETECTION, status: OutcomeStatus.MISSED },
            { type: OutcomeType.PREVENTION, status: OutcomeStatus.PREVENTED },
            { type: OutcomeType.ATTRIBUTION, status: OutcomeStatus.MISSED },
          ],
        },
      ];

      mockDb.mitreTechnique.findMany.mockResolvedValue(mockMitreTechniques);
      mockDb.technique.findMany.mockResolvedValue(mockExecutedTechniques);

      const ctx = createMockContext();
      const caller = analyticsRouter.createCaller(ctx);

      const result = await caller.coverage.techniqueMetrics();

      // Should return metrics for all MITRE techniques (executed + unexecuted)
      expect(result).toHaveLength(2);
      
      // Check executed technique metrics (T1566 - executed twice)
      const phishingMetrics = result.find(t => t.techniqueId === "T1566");
      expect(phishingMetrics).toBeDefined();
      expect(phishingMetrics!.executionCount).toBe(2);
      expect(phishingMetrics!.detectionRate).toBe(50); // 1 out of 2 detected
      expect(phishingMetrics!.preventionRate).toBe(50); // 1 out of 2 prevented
      expect(phishingMetrics!.attributionRate).toBe(50); // 1 out of 2 attributed

      // Check unexecuted technique metrics (T1059 - not executed)
      const scriptingMetrics = result.find(t => t.techniqueId === "T1059");
      expect(scriptingMetrics).toBeDefined();
      expect(scriptingMetrics!.executionCount).toBe(0);
      expect(scriptingMetrics!.detectionRate).toBe(0);
      expect(scriptingMetrics!.preventionRate).toBe(0);
      expect(scriptingMetrics!.attributionRate).toBe(0);

      // Verify database calls
      expect(mockDb.mitreTechnique.findMany).toHaveBeenCalledWith({
        include: { tactic: true },
      });
      expect(mockDb.technique.findMany).toHaveBeenCalledWith({
        include: {
          mitreTechnique: { include: { tactic: true } },
          operation: { select: { id: true, name: true, status: true } },
          outcomes: true,
        },
        where: {
          operation: {},
        },
      });
    });

    it("should handle techniques with no outcomes gracefully", async () => {
      const mockMitreTechniques = [
        { id: "T1566", name: "Phishing", tactic: { id: "TA0001", name: "Initial Access" } },
      ];

      const mockExecutedTechniques = [
        {
          id: "tech1",
          mitreTechnique: { id: "T1566", name: "Phishing", tactic: { id: "TA0001", name: "Initial Access" } },
          operation: { id: "op1", name: "Test Op", status: "COMPLETED" },
          outcomes: [], // No outcomes
        },
      ];

      mockDb.mitreTechnique.findMany.mockResolvedValue(mockMitreTechniques);
      mockDb.technique.findMany.mockResolvedValue(mockExecutedTechniques);

      const ctx = createMockContext();
      const caller = analyticsRouter.createCaller(ctx);

      const result = await caller.coverage.techniqueMetrics();

      const phishingMetrics = result.find(t => t.techniqueId === "T1566");
      expect(phishingMetrics!.executionCount).toBe(1);
      expect(phishingMetrics!.detectionRate).toBe(0);
      expect(phishingMetrics!.preventionRate).toBe(0);
      expect(phishingMetrics!.attributionRate).toBe(0);
      expect(phishingMetrics!.avgEffectiveness).toBe(0);
    });

    it("should require authentication", async () => {
      const ctx = { ...createMockContext(), session: null };
      const caller = analyticsRouter.createCaller(ctx);

      await expect(caller.coverage.techniqueMetrics()).rejects.toThrow("UNAUTHORIZED");
    });
  });

  describe("getTrends", () => {
    it("should return basic structure", async () => {
      mockDb.operation.findMany.mockResolvedValue([]);
      mockDb.technique.findMany.mockResolvedValue([]);

      const ctx = createMockContext();
      const caller = analyticsRouter.createCaller(ctx);

      const result = await caller.trends.operations({
        period: "30d",
        groupBy: "week",
      });

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it("should call database with date filtering", async () => {
      mockDb.operation.findMany.mockResolvedValue([]);
      mockDb.technique.findMany.mockResolvedValue([]);

      const ctx = createMockContext();
      const caller = analyticsRouter.createCaller(ctx);

      await caller.trends.operations({
        period: "30d",
        groupBy: "month",
      });

      expect(mockDb.operation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "COMPLETED",
            endDate: expect.objectContaining({ gte: expect.any(Date) }),
          }),
          orderBy: { endDate: "asc" },
          select: { id: true, status: true, endDate: true },
        })
      );
      expect(mockDb.technique.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            endTime: expect.objectContaining({ gte: expect.any(Date) }),
            operation: expect.objectContaining({ status: "COMPLETED" }),
          }),
          orderBy: { endTime: "asc" },
          select: { endTime: true },
        })
      );
    });

    it("supports all-time period", async () => {
      mockDb.operation.findMany.mockResolvedValue([]);
      mockDb.technique.findMany.mockResolvedValue([]);
      const ctx = createMockContext();
      const caller = analyticsRouter.createCaller(ctx);
      await caller.trends.operations({ period: "all", groupBy: "month" });
      const opArgs = mockDb.operation.findMany.mock.calls[0][0];
      expect(opArgs.where?.endDate?.gte).toEqual(new Date(0));
      const techArgs = mockDb.technique.findMany.mock.calls[0][0];
      expect(techArgs.where?.endTime?.gte).toEqual(new Date(0));
    });

    it("should handle basic operations query", async () => {
      mockDb.operation.findMany.mockResolvedValue([]);
      mockDb.technique.findMany.mockResolvedValue([]);

      const ctx = createMockContext();
      const caller = analyticsRouter.createCaller(ctx);

      const result = await caller.trends.operations({
        period: "30d",
        groupBy: "month",
      });

      expect(result).toEqual([]);
      expect(mockDb.operation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: "COMPLETED",
            endDate: expect.objectContaining({ gte: expect.any(Date) }),
          }),
        })
      );
      expect(mockDb.technique.findMany).toHaveBeenCalled();
    });

    it("should require authentication", async () => {
      const ctx = { ...createMockContext(), session: null };
      const caller = analyticsRouter.createCaller(ctx);

      await expect(
        caller.trends.operations({ period: "30d", groupBy: "month" })
      ).rejects.toThrow("UNAUTHORIZED");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty database", async () => {
      mockDb.mitreTechnique.findMany.mockResolvedValue([]);
      mockDb.technique.findMany.mockResolvedValue([]);
      mockDb.operation.findMany.mockResolvedValue([]);

      const ctx = createMockContext();
      const analyticsCaller = analyticsRouter.createCaller(ctx);

      const metricsResult = await analyticsCaller.coverage.techniqueMetrics();
      expect(metricsResult).toHaveLength(0);

      const trendsResult = await analyticsCaller.trends.operations({ period: "30d", groupBy: "month" });
      expect(trendsResult).toHaveLength(0);
    });
  });
});