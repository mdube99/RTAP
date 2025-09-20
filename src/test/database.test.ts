import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@prisma/client";
import { databaseRouter } from "@/server/api/routers/database";

// Mock database
vi.mock("@/server/db", () => ({
  db: {
    user: { count: vi.fn(), findMany: vi.fn() },
    operation: { count: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
    mitreTactic: { count: vi.fn(), findMany: vi.fn() },
    mitreTechnique: { count: vi.fn(), findMany: vi.fn() },
    mitreSubTechnique: { count: vi.fn(), findMany: vi.fn() },
    technique: { count: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
    outcome: { count: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
    threatActor: { count: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
    crownJewel: { count: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
    tag: { count: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
    tool: { count: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
    toolCategory: { deleteMany: vi.fn(), findMany: vi.fn() },
    logSource: { count: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
    group: { count: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
    userGroup: { count: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
    attackFlowLayout: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

const { db } = await import("@/server/db");
const mockDb = vi.mocked(db, true);

// Add missing method (for prior tests); keep for safety
mockDb.user.findFirst = vi.fn();

// Helper to create mock context
const createMockContext = (role: UserRole) => ({
  headers: new Headers(),
  session: {
    user: { id: "test-user-id", role },
    expires: "2099-01-01",
  },
  db: mockDb,
  requestId: "database-test",
});

// Create tRPC caller with mock context
const createCaller = (role: UserRole) => {
  const ctx = createMockContext(role);
  return databaseRouter.createCaller(ctx);
};

describe("Database Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getStats", () => {
    it("should return database statistics for admin users", async () => {
      const caller = createCaller(UserRole.ADMIN);
      
      // Mock count responses
      mockDb.user.count.mockResolvedValue(5);
      mockDb.operation.count.mockResolvedValue(10);
      mockDb.mitreTactic.count.mockResolvedValue(14);
      mockDb.mitreTechnique.count.mockResolvedValue(200);
      mockDb.mitreSubTechnique.count.mockResolvedValue(400);
      mockDb.technique.count.mockResolvedValue(50);
      mockDb.outcome.count.mockResolvedValue(150);
      mockDb.threatActor.count.mockResolvedValue(8);
      mockDb.crownJewel.count.mockResolvedValue(12);
      mockDb.tag.count.mockResolvedValue(6);
      mockDb.tool.count.mockResolvedValue(15);
      mockDb.logSource.count.mockResolvedValue(4);
      mockDb.group.count.mockResolvedValue(3);
      mockDb.userGroup.count.mockResolvedValue(10);

      const result = await caller.getStats();

      expect(result).toEqual({
        users: 5,
        operations: 10,
        mitreTactics: 14,
        mitreTechniques: 200,
        mitreSubTechniques: 400,
        techniques: 50,
        outcomes: 150,
        threatActors: 8,
        crownJewels: 12,
        tags: 6,
        tools: 15,
        logSources: 4,
        groups: 3,
        userGroups: 10,
      });
    });

    it("should throw FORBIDDEN for non-admin users", async () => {
      const caller = createCaller(UserRole.VIEWER);
      
      await expect(caller.getStats()).rejects.toThrow("Admin access required");
    });
  });

  describe("backup", () => {
    it("should create backup for admin users", async () => {
      const caller = createCaller(UserRole.ADMIN);
      
      // Mock findMany methods for backup data
      mockDb.user.findMany = vi.fn().mockResolvedValue([
        { id: "1", email: "admin@example.com", name: "Admin" }
      ]);
      mockDb.operation.findMany = vi.fn().mockResolvedValue([]);
      mockDb.mitreTactic.findMany = vi.fn().mockResolvedValue([]);
      mockDb.mitreTechnique.findMany = vi.fn().mockResolvedValue([]);
      mockDb.mitreSubTechnique.findMany = vi.fn().mockResolvedValue([]);
      mockDb.threatActor.findMany = vi.fn().mockResolvedValue([]);
      mockDb.crownJewel.findMany = vi.fn().mockResolvedValue([]);
      mockDb.tag.findMany = vi.fn().mockResolvedValue([]);
      mockDb.tool.findMany = vi.fn().mockResolvedValue([]);
      mockDb.logSource.findMany = vi.fn().mockResolvedValue([]);
      mockDb.attackFlowLayout.findMany = vi.fn().mockResolvedValue([]);
      mockDb.group.findMany = vi.fn().mockResolvedValue([]);
      mockDb.userGroup.findMany = vi.fn().mockResolvedValue([]);
      mockDb.technique.findMany = vi.fn().mockResolvedValue([]);
      mockDb.outcome.findMany = vi.fn().mockResolvedValue([]);

      const result = await caller.backup();
      
      expect(result).toContain('"version": "1.0"');
      expect(result).toContain('"data":');
      expect(typeof result).toBe("string");
    });

    it("should throw FORBIDDEN for non-admin users", async () => {
      const caller = createCaller(UserRole.OPERATOR);
      
      await expect(caller.backup()).rejects.toThrow("Admin access required");
    });
  });

  describe("clearData", () => {
    it("should clear operations data for admin users", async () => {
      const caller = createCaller(UserRole.ADMIN);
      
      mockDb.$transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });
      mockDb.outcome.deleteMany.mockResolvedValue({ count: 10 });
      mockDb.technique.deleteMany.mockResolvedValue({ count: 5 });
      mockDb.operation.deleteMany.mockResolvedValue({ count: 3 });

      await caller.clearData({ clearOperations: true, clearTaxonomy: false });

      expect(mockDb.outcome.deleteMany).toHaveBeenCalled();
      expect(mockDb.technique.deleteMany).toHaveBeenCalled();
      expect(mockDb.operation.deleteMany).toHaveBeenCalled();
      expect(mockDb.threatActor.deleteMany).not.toHaveBeenCalled();
    });

    it("should clear taxonomy data for admin users", async () => {
      const caller = createCaller(UserRole.ADMIN);
      
      mockDb.$transaction.mockImplementation(async (callback) => {
        return await callback(mockDb);
      });
      mockDb.userGroup.deleteMany.mockResolvedValue({ count: 5 });
      mockDb.group.deleteMany.mockResolvedValue({ count: 2 });
      mockDb.logSource.deleteMany.mockResolvedValue({ count: 3 });
      mockDb.tool.deleteMany.mockResolvedValue({ count: 8 });
      mockDb.tag.deleteMany.mockResolvedValue({ count: 4 });
      mockDb.crownJewel.deleteMany.mockResolvedValue({ count: 6 });
      mockDb.threatActor.deleteMany.mockResolvedValue({ count: 7 });

      await caller.clearData({ clearOperations: false, clearTaxonomy: true });

      expect(mockDb.threatActor.deleteMany).toHaveBeenCalled();
      expect(mockDb.tag.deleteMany).toHaveBeenCalled();
      expect(mockDb.tool.deleteMany).toHaveBeenCalled();
      expect(mockDb.operation.deleteMany).not.toHaveBeenCalled();
    });

    it("should throw FORBIDDEN for non-admin users", async () => {
      const caller = createCaller(UserRole.VIEWER);
      
      await expect(caller.clearData({ clearOperations: true, clearTaxonomy: false })).rejects.toThrow("Admin access required");
    });
  });
});
