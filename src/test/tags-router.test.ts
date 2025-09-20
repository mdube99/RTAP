import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { tagsRouter } from "@/server/api/routers/taxonomy/tags";
import { createTestContext } from "@/test/utils/context";

vi.mock("@/server/db", () => ({
  db: {
    tag: { findMany: vi.fn() },
  },
}));

const mockDb = (await import("@/server/db")).db as any;

describe("tags router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects create for non-admin", async () => {
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = tagsRouter.createCaller(ctx);
    await expect(
      caller.create({ name: "Tag", description: "d", color: "#ffffff" })
    ).rejects.toThrow(new TRPCError({ code: "FORBIDDEN", message: "Admin access required" }));
  });

  it("lists all tags for non-admin (metadata only)", async () => {
    mockDb.tag.findMany.mockResolvedValue([{ id: "t1" }, { id: "t2" }]);
    const ctx = createTestContext(mockDb, "OPERATOR");
    const caller = tagsRouter.createCaller(ctx);
    const result = await caller.list();
    expect(mockDb.tag.findMany).toHaveBeenCalledWith({ orderBy: { name: "asc" } });
    expect(result).toEqual([{ id: "t1" }, { id: "t2" }]);
  });
});
