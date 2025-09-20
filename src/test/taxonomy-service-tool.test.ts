import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { PrismaClient, ToolType } from "@prisma/client";
import { updateTool, deleteTool } from "@/server/services/taxonomyService";

const mockDb = {
  tool: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
  toolCategory: { findFirst: vi.fn() },
  technique: { count: vi.fn() },
  outcome: { count: vi.fn() },
};

describe("taxonomyService tool helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("validates category on update", async () => {
    mockDb.tool.findUnique.mockResolvedValue({ id: "t1", categoryId: "c1", type: "DEFENSE" });
    mockDb.toolCategory.findFirst.mockResolvedValue(null);
    await expect(
      updateTool(mockDb as unknown as PrismaClient, {
        id: "t1",
        categoryId: "c2",
        type: "OFFENSE" as ToolType,
      })
    ).rejects.toThrow(new TRPCError({ code: "BAD_REQUEST", message: "Invalid category for tool type" }));
  });

  it("prevents deleting tool in use", async () => {
    mockDb.technique.count.mockResolvedValue(1);
    mockDb.outcome.count.mockResolvedValue(0);
    await expect(deleteTool(mockDb as unknown as PrismaClient, "t1")).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete tool: 1 technique(s) and 0 outcome(s) are using this tool" })
    );
  });
});

