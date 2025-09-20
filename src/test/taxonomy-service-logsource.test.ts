import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";
import { deleteLogSource } from "@/server/services/taxonomyService";

const mockDb = {
  outcome: { count: vi.fn() },
  logSource: { delete: vi.fn() },
};

describe("taxonomyService log source helpers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("blocks deleting log source in use", async () => {
    mockDb.outcome.count.mockResolvedValue(4);
    await expect(
      deleteLogSource(mockDb as unknown as PrismaClient, "ls1"),
    ).rejects.toThrow(
      new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Cannot delete log source: 4 outcome(s) are using this log source",
      }),
    );
  });
});
