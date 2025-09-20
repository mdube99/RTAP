import { describe, it, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { deleteGroup } from "@/server/services/groupService";
import type { PrismaClient } from "@prisma/client";

const groupFindUnique = vi.fn();
const groupDelete = vi.fn();
const accessGroupCount = vi.fn();

const mockDb = {
  group: { findUnique: groupFindUnique, delete: groupDelete },
  operationAccessGroup: { count: accessGroupCount },
} as unknown as PrismaClient;

describe("groupService.deleteGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes group", async () => {
    groupFindUnique.mockResolvedValue({ id: "g1" });
    accessGroupCount.mockResolvedValue(0);
    const result = { id: "g1" } as any;
    groupDelete.mockResolvedValue(result);

    const res = await deleteGroup(mockDb, "g1");

    expect(groupDelete).toHaveBeenCalledWith({ where: { id: "g1" } });
    expect(res).toBe(result);
  });

  it("throws when group not found", async () => {
    groupFindUnique.mockResolvedValue(null);
    accessGroupCount.mockResolvedValue(0);

    await expect(deleteGroup(mockDb, "missing")).rejects.toThrow(
      new TRPCError({ code: "NOT_FOUND", message: "Group not found" })
    );
  });

  it("prevents deletion when operations are restricted to group", async () => {
    groupFindUnique.mockResolvedValue({ id: "g1" });
    accessGroupCount.mockResolvedValue(2);

    await expect(deleteGroup(mockDb, "g1")).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "Cannot delete a group while operations are restricted to it" })
    );

    expect(groupDelete).not.toHaveBeenCalled();
  });
});
