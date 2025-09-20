import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserRole } from "@prisma/client";
import { databaseRouter } from "@/server/api/routers/database";

vi.mock("@/server/db", () => ({
  db: {
    $transaction: vi.fn(),
    // Taxonomy
    threatActor: { createMany: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    crownJewel: { createMany: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    tag: { createMany: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    toolCategory: { createMany: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    tool: { createMany: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    logSource: { createMany: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    // Ops
    operation: { create: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    technique: { create: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    outcome: { create: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn() },
    // Users & groups
    user: { findMany: vi.fn(), upsert: vi.fn() },
    group: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn(), findUnique: vi.fn() },
    userGroup: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
    // MITRE (read-only in backup)
    mitreTactic: { findMany: vi.fn() },
    mitreTechnique: { findMany: vi.fn() },
    mitreSubTechnique: { findMany: vi.fn() },
  },
}));

const { db } = await import("@/server/db");
const mockDb = vi.mocked(db, true);

const createCaller = (role: UserRole) => {
  const ctx = {
    headers: new Headers(),
    session: { user: { id: "u1", role }, expires: "2099-01-01" },
    db: mockDb,
    requestId: "database-restore-test",
  };
  return databaseRouter.createCaller(ctx);
};

describe("Database Restore", () => {
  beforeEach(() => vi.clearAllMocks());

  it("restores taxonomy and operations after clearing when requested", async () => {
    const caller = createCaller(UserRole.ADMIN);

    mockDb.$transaction.mockImplementation(async (cb: (tx: typeof mockDb) => Promise<void> | void) => {
      await cb(mockDb);
      return undefined as unknown as void;
    });

    const payload = {
      threatActors: [{ id: "ta1", name: "APT29", description: "desc" }],
      crownJewels: [{ id: "cj1", name: "DB", description: "desc" }],
      tags: [{ id: "tg1", name: "Stealth", description: "d" }],
      toolCategories: [{ id: "tc1", name: "EDR", type: "DEFENSIVE" }],
      tools: [{ id: "tl1", name: "Falcon", categoryId: "tc1", type: "DEFENSIVE" }],
      logSources: [{ id: "ls1", name: "SIEM", description: "d" }],
      operations: [{ id: 1, name: "Op1", description: "d", createdById: "u1", tags: [{ id: "tg1" }], crownJewels: [{ id: "cj1" }] }],
      techniques: [{ id: "tech1", description: "d", operationId: 1 }],
      outcomes: [{ id: "out1", type: "DETECTION", status: "DETECTED", techniqueId: "tech1" }],
    };
    const backup = JSON.stringify({ version: "1.0", timestamp: new Date().toISOString(), data: payload });

    await caller.restore({ backupData: backup, restoreTaxonomyAndOperations: true, restoreUsersAndGroups: false, clearBefore: true });

    expect(mockDb.threatActor.createMany).toHaveBeenCalled();
    expect(mockDb.operation.create).toHaveBeenCalled();
    expect(mockDb.technique.create).toHaveBeenCalled();
    expect(mockDb.outcome.create).toHaveBeenCalled();
  });

  it("rejects when neither section selected", async () => {
    const caller = createCaller(UserRole.ADMIN);
    const backup = JSON.stringify({ version: "1.0", timestamp: new Date().toISOString(), data: {} });
    await expect(
      caller.restore({ backupData: backup, restoreTaxonomyAndOperations: false, restoreUsersAndGroups: false, clearBefore: false })
    ).rejects.toThrow("Select at least one section to restore");
  });

  it("requires clearBefore when restoring taxonomy+operations", async () => {
    const caller = createCaller(UserRole.ADMIN);
    const backup = JSON.stringify({ version: "1.0", timestamp: new Date().toISOString(), data: {} });
    await expect(
      caller.restore({ backupData: backup, restoreTaxonomyAndOperations: true, restoreUsersAndGroups: false, clearBefore: false })
    ).rejects.toThrow("requires clearing existing data first");
  });

  it("fails when operations reference missing access groups", async () => {
    const caller = createCaller(UserRole.ADMIN);

    mockDb.$transaction.mockImplementation(async (cb: (tx: typeof mockDb) => Promise<void> | void) => {
      await cb(mockDb);
      return undefined as unknown as void;
    });

    const payload = {
      operations: [
        {
          id: 1,
          name: "Op1",
          description: "d",
          createdById: "u1",
          visibility: "GROUPS_ONLY",
          accessGroups: [{ groupId: "g1" }],
        },
      ],
    };

    const backup = JSON.stringify({ version: "1.0", timestamp: new Date().toISOString(), data: payload });

    mockDb.group.findMany.mockResolvedValue([]);

    await expect(
      caller.restore({ backupData: backup, restoreTaxonomyAndOperations: true, restoreUsersAndGroups: false, clearBefore: true })
    ).rejects.toThrow("One or more groups referenced by operations are missing");
  });
});
