import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { techniquesRouter } from "@/server/api/routers/techniques";
import { createTestContext } from "@/test/utils/context";

vi.mock("@/server/db", () => ({
  db: {
    technique: { findUnique: vi.fn(), update: vi.fn() },
    mitreTechnique: { findUnique: vi.fn() },
    mitreSubTechnique: { findUnique: vi.fn() },
    tool: { findMany: vi.fn() },
    operation: { findUnique: vi.fn() },
  },
}));

const mockDb = (await import("@/server/db")).db as any;
const baseTechnique = { id: "technique-1", operationId: 1, operation: { id: 1, createdById: "user-1" } };

describe("Techniques Router — update", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.operation.findUnique.mockResolvedValue({
      id: 1,
      createdById: "user-1",
      visibility: "EVERYONE",
      accessGroups: [],
    });
  });

  it("should update technique successfully", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = techniquesRouter.createCaller(ctx);
    mockDb.technique.findUnique.mockResolvedValue(baseTechnique);
    mockDb.tool.findMany.mockResolvedValue([{ id: "tool-2", name: "Metasploit" }]);
    mockDb.technique.update.mockResolvedValue({ id: "technique-1", description: "Updated" });
    const res = await caller.update({ id: "technique-1", description: "Updated", toolIds: ["tool-2"] });
    expect(res).toEqual({ id: "technique-1", description: "Updated" });
  });

  it("should throw error if technique not found", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = techniquesRouter.createCaller(ctx);
    mockDb.technique.findUnique.mockResolvedValue(null);
    await expect(caller.update({ id: "none", description: "x" })).rejects.toThrow(
      new TRPCError({ code: "NOT_FOUND", message: "Technique not found" }),
    );
  });
});
