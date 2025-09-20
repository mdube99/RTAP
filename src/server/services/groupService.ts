import { TRPCError } from "@trpc/server";
import type { PrismaClient } from "@prisma/client";

export type CreateGroupDTO = {
  name: string;
  description: string;
  memberIds?: string[];
};

export type UpdateGroupDTO = {
  id: string;
  name?: string;
  description?: string;
};

export async function createGroup(db: PrismaClient, dto: CreateGroupDTO) {
  const existingGroup = await db.group.findUnique({ where: { name: dto.name } });
  if (existingGroup) throw new TRPCError({ code: "BAD_REQUEST", message: "A group with this name already exists" });

  if (dto.memberIds?.length) {
    const users = await db.user.findMany({ where: { id: { in: dto.memberIds } } });
    if (users.length !== dto.memberIds.length) throw new TRPCError({ code: "BAD_REQUEST", message: "One or more users not found" });
  }

  return db.group.create({
    data: {
      name: dto.name,
      description: dto.description,
      members: dto.memberIds
        ? { create: dto.memberIds.map((userId) => ({ userId })) }
        : undefined,
    },
    include: defaultGroupInclude(),
  });
}

export async function updateGroup(db: PrismaClient, dto: UpdateGroupDTO) {
  const { id, ...updateData } = dto;
  const existingGroup = await db.group.findUnique({ where: { id } });
  if (!existingGroup) throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });

  if (updateData.name && updateData.name !== existingGroup.name) {
    const duplicate = await db.group.findUnique({ where: { name: updateData.name } });
    if (duplicate) throw new TRPCError({ code: "BAD_REQUEST", message: "A group with this name already exists" });
  }

  return db.group.update({
    where: { id },
    data: updateData,
    include: defaultGroupInclude(),
  });
}

export async function deleteGroup(db: PrismaClient, id: string) {
  const group = await db.group.findUnique({ where: { id } });
  if (!group) throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });

  const restrictedOperationCount = await db.operationAccessGroup.count({ where: { groupId: id } });
  if (restrictedOperationCount > 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Cannot delete a group while operations are restricted to it",
    });
  }

  return db.group.delete({ where: { id } });
}

export async function addMembersToGroup(db: PrismaClient, groupId: string, userIds: string[]) {
  const group = await db.group.findUnique({ where: { id: groupId }, include: { members: { select: { userId: true } } } });
  if (!group) throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });

  const existingMemberIds = group.members.map((m) => m.userId);
  const newUserIds = userIds.filter((id) => !existingMemberIds.includes(id));
  if (newUserIds.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "All specified users are already members of this group" });

  const users = await db.user.findMany({ where: { id: { in: newUserIds } } });
  if (users.length !== newUserIds.length) throw new TRPCError({ code: "BAD_REQUEST", message: "One or more users not found" });

  await db.userGroup.createMany({ data: newUserIds.map((userId) => ({ userId, groupId })) });

  return db.group.findUnique({ where: { id: groupId }, include: defaultGroupInclude() });
}

export async function removeMembersFromGroup(db: PrismaClient, groupId: string, userIds: string[]) {
  const group = await db.group.findUnique({ where: { id: groupId } });
  if (!group) throw new TRPCError({ code: "NOT_FOUND", message: "Group not found" });

  await db.userGroup.deleteMany({ where: { groupId, userId: { in: userIds } } });

  return db.group.findUnique({ where: { id: groupId }, include: defaultGroupInclude() });
}

export function defaultGroupInclude() {
  return {
    members: {
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
      },
    },
  } as const;
}
