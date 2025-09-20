import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { techniquesRouter } from "@/server/api/routers/techniques";
import { createTestContext } from "@/test/utils/context";

vi.mock("@/server/db", () => ({
  db: {
    technique: { findFirst: vi.fn(), findMany: vi.fn() },
    operation: { findUnique: vi.fn() },
    userGroup: { findMany: vi.fn() },
    group: { findMany: vi.fn() },
  },
}));

const mockDb = (await import("@/server/db")).db as any;
const mockTechnique = { id: "technique-1" };

describe("Techniques Router — read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.userGroup.findMany.mockResolvedValue([]);
    mockDb.group.findMany.mockResolvedValue([]);
  });

  it("should return technique by ID", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = techniquesRouter.createCaller(ctx);
    mockDb.technique.findFirst.mockResolvedValue(mockTechnique);
    const res = await caller.getById({ id: "technique-1" });
    expect(res).toEqual(mockTechnique);
  });

  it("should throw error if technique not found", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = techniquesRouter.createCaller(ctx);
    mockDb.technique.findFirst.mockResolvedValue(null);
    await expect(caller.getById({ id: "none" })).rejects.toThrow(
      new TRPCError({ code: "NOT_FOUND", message: "Technique not found" }),
    );
  });

  it("should list techniques for operation and paginate", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = techniquesRouter.createCaller(ctx);
    mockDb.operation.findUnique.mockResolvedValue({ id: 1, visibility: "EVERYONE", accessGroups: [] });
    const list = Array.from({ length: 11 }, (_, i) => ({ id: `technique-${i}` }));
    mockDb.technique.findMany.mockResolvedValue(list);
    const result = await caller.list({ operationId: 1, limit: 10, cursor: "technique-5" });
    expect(result.techniques).toHaveLength(10);
    expect(result.nextCursor).toBe("technique-10");
  });
});
