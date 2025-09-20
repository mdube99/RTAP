import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { deleteThreatActor, updateThreatActor } from "@/server/services/threatActorService";
import type { PrismaClient } from "@prisma/client";

const mockDb = {
  operation: { count: vi.fn() },
  threatActor: { update: vi.fn(), delete: vi.fn() },
};

describe("threatActorService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("refuses to delete when operations reference actor", async () => {
    mockDb.operation.count.mockResolvedValue(3);
    await expect(deleteThreatActor(mockDb as unknown as PrismaClient, "ta1")).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete threat actor: 3 operation(s) are using this threat actor" })
    );
  });

  it("updates technique associations", async () => {
    mockDb.threatActor.update.mockResolvedValue({ id: "ta1", mitreTechniques: [] });
    await updateThreatActor(mockDb as unknown as PrismaClient, { id: "ta1", mitreTechniqueIds: ["t1", "t2"] });
    expect(mockDb.threatActor.update).toHaveBeenCalledWith({
      where: { id: "ta1" },
      data: {
        mitreTechniques: { set: [{ id: "t1" }, { id: "t2" }] },
      },
      include: { mitreTechniques: { include: { tactic: true } } },
    });
  });
});
