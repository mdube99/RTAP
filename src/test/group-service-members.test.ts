import { describe, it, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import {
  addMembersToGroup,
  removeMembersFromGroup,
  defaultGroupInclude,
} from "@/server/services/groupService";
import type { PrismaClient } from "@prisma/client";

const groupFindUnique = vi.fn();
const userFindMany = vi.fn();
const userGroupCreateMany = vi.fn();
const userGroupDeleteMany = vi.fn();

const mockDb = {
  group: { findUnique: groupFindUnique },
  user: { findMany: userFindMany },
  userGroup: { createMany: userGroupCreateMany, deleteMany: userGroupDeleteMany },
} as unknown as PrismaClient;

describe("groupService.addMembersToGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds members to group", async () => {
    const result = { id: "g1" } as any;
    groupFindUnique
      .mockResolvedValueOnce({ id: "g1", members: [] })
      .mockResolvedValueOnce(result);
    userFindMany.mockResolvedValue([{ id: "u1" }]);
    userGroupCreateMany.mockResolvedValue({ count: 1 });

    const res = await addMembersToGroup(mockDb, "g1", ["u1"]);

    expect(groupFindUnique).toHaveBeenNthCalledWith(1, {
      where: { id: "g1" },
      include: { members: { select: { userId: true } } },
    });
    expect(userGroupCreateMany).toHaveBeenCalledWith({
      data: [{ userId: "u1", groupId: "g1" }],
    });
    expect(groupFindUnique).toHaveBeenNthCalledWith(2, {
      where: { id: "g1" },
      include: defaultGroupInclude(),
    });
    expect(res).toBe(result);
  });

  it("throws when group not found", async () => {
    groupFindUnique.mockResolvedValue(null);

    await expect(addMembersToGroup(mockDb, "g1", ["u1"]))
      .rejects.toThrow(new TRPCError({ code: "NOT_FOUND", message: "Group not found" }));
  });

  it("throws when users already members", async () => {
    groupFindUnique.mockResolvedValue({ id: "g1", members: [{ userId: "u1" }] });

    await expect(addMembersToGroup(mockDb, "g1", ["u1"]))
      .rejects.toThrow(
        new TRPCError({
          code: "BAD_REQUEST",
          message: "All specified users are already members of this group",
        })
      );
  });

  it("throws when user not found", async () => {
    groupFindUnique.mockResolvedValue({ id: "g1", members: [] });
    userFindMany.mockResolvedValue([]);

    await expect(addMembersToGroup(mockDb, "g1", ["u1"]))
      .rejects.toThrow(
        new TRPCError({ code: "BAD_REQUEST", message: "One or more users not found" })
      );
  });
});

describe("groupService.removeMembersFromGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("removes members from group", async () => {
    const result = { id: "g1" } as any;
    groupFindUnique
      .mockResolvedValueOnce({ id: "g1" })
      .mockResolvedValueOnce(result);
    userGroupDeleteMany.mockResolvedValue({ count: 1 });

    const res = await removeMembersFromGroup(mockDb, "g1", ["u1"]);

    expect(groupFindUnique).toHaveBeenNthCalledWith(1, { where: { id: "g1" } });
    expect(userGroupDeleteMany).toHaveBeenCalledWith({
      where: { groupId: "g1", userId: { in: ["u1"] } },
    });
    expect(groupFindUnique).toHaveBeenNthCalledWith(2, {
      where: { id: "g1" },
      include: defaultGroupInclude(),
    });
    expect(res).toBe(result);
  });

  it("throws when group not found", async () => {
    groupFindUnique.mockResolvedValue(null);

    await expect(removeMembersFromGroup(mockDb, "missing", ["u1"]))
      .rejects.toThrow(new TRPCError({ code: "NOT_FOUND", message: "Group not found" }));
  });
});
