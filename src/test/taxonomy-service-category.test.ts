import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";
import { deleteToolCategory } from "@/server/services/taxonomyService";

const mockDb = {
  tool: { count: vi.fn() },
  toolCategory: { delete: vi.fn() },
};

describe("taxonomyService tool category helpers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks deleting category in use", async () => {
    mockDb.tool.count.mockResolvedValue(3);
    await expect(deleteToolCategory(mockDb as unknown as PrismaClient, "c1")).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete category: 3 tool(s) are using this category" })
    );
  });
});

