import { describe, it, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { updateGroup, defaultGroupInclude } from "@/server/services/groupService";
import type { PrismaClient } from "@prisma/client";

const groupFindUnique = vi.fn();
const groupUpdate = vi.fn();

const mockDb = {
  group: { findUnique: groupFindUnique, update: groupUpdate },
} as unknown as PrismaClient;

describe("groupService.updateGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates group details", async () => {
    groupFindUnique
      .mockResolvedValueOnce({ id: "g1", name: "Old" })
      .mockResolvedValueOnce(null);
    const result = { id: "g1" } as any;
    groupUpdate.mockResolvedValue(result);

    const res = await updateGroup(mockDb, {
      id: "g1",
      name: "New",
      description: "Desc",
    });

    expect(groupUpdate).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: { name: "New", description: "Desc" },
      include: defaultGroupInclude(),
    });
    expect(res).toBe(result);
  });

  it("throws when group not found", async () => {
    groupFindUnique.mockResolvedValue(null);

    await expect(updateGroup(mockDb, { id: "missing" })).rejects.toThrow(
      new TRPCError({ code: "NOT_FOUND", message: "Group not found" })
    );
  });

  it("throws when group name exists", async () => {
    groupFindUnique
      .mockResolvedValueOnce({ id: "g1", name: "Old" })
      .mockResolvedValueOnce({ id: "g2" });

    await expect(
      updateGroup(mockDb, { id: "g1", name: "Existing" })
    ).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "A group with this name already exists" })
    );
  });
});
