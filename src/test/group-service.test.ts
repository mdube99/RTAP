import { describe, it, expect, beforeEach, vi } from "vitest";
import { TRPCError } from "@trpc/server";
import { createGroup, defaultGroupInclude } from "@/server/services/groupService";
import type { PrismaClient } from "@prisma/client";

const groupFindUnique = vi.fn();
const groupCreate = vi.fn();
const userFindMany = vi.fn();

const mockDb = {
  group: { findUnique: groupFindUnique, create: groupCreate },
  user: { findMany: userFindMany },
} as unknown as PrismaClient;

describe("groupService.createGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates group with members", async () => {
    groupFindUnique.mockResolvedValue(null);
    userFindMany.mockResolvedValue([{ id: "user-1" }]);
    const result = { id: "group-1" } as any;
    groupCreate.mockResolvedValue(result);

    const res = await createGroup(mockDb, {
      name: "Blue Team",
      description: "Test group",
      memberIds: ["user-1"],
    });

    expect(groupCreate).toHaveBeenCalledWith({
      data: {
        name: "Blue Team",
        description: "Test group",
        members: { create: [{ userId: "user-1" }] },
      },
      include: defaultGroupInclude(),
    });
    expect(res).toBe(result);
  });

  it("creates group without members", async () => {
    groupFindUnique.mockResolvedValue(null);
    const result = { id: "group-1" } as any;
    groupCreate.mockResolvedValue(result);

    const res = await createGroup(mockDb, {
      name: "Blue Team",
      description: "Test group",
    });

    expect(groupCreate).toHaveBeenCalledWith({
      data: {
        name: "Blue Team",
        description: "Test group",
      },
      include: defaultGroupInclude(),
    });
    expect(res).toBe(result);
  });

  it("throws when group name exists", async () => {
    groupFindUnique.mockResolvedValue({ id: "existing" });

    await expect(
      createGroup(mockDb, { name: "Blue", description: "Desc" })
    ).rejects.toThrow(
      new TRPCError({ code: "BAD_REQUEST", message: "A group with this name already exists" })
    );
  });
});
