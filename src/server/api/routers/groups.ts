import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure, protectedProcedure } from "@/server/api/trpc";
import {
  createGroup as createGroupService,
  updateGroup as updateGroupService,
  deleteGroup as deleteGroupService,
  addMembersToGroup,
  removeMembersFromGroup,
} from "@/server/services/groupService";
import { auditEvent, logger } from "@/server/logger";

export const groupsRouter = createTRPCRouter({
  // List all groups (accessible to all authenticated users to check their own memberships)
  list: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx.session;
    
    // Apply filtering at database query level for efficiency and security
    const whereClause = user.role === "ADMIN" 
      ? {} 
      : { members: { some: { userId: user.id } } };

    const groups = await ctx.db.group.findMany({
      where: whereClause,
      include: {
        members: {
          select: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            operationAccess: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return groups;
  }),

  // Get a single group by ID (admin only for full details)
  get: adminProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const group = await ctx.db.group.findUnique({
        where: { id: input.id },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
            },
          },
        },
      });

      if (!group) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Group not found",
        });
      }

      return group;
    }),

  // Create a new group (admin only)
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1, "Group name is required"),
        description: z.string().min(1, "Description is required"),
        memberIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const group = await createGroupService(ctx.db, input);
      logger.info(
        auditEvent(ctx, "sec.group.create", { groupId: group.id, groupName: group.name }),
        "Group created",
      );
      return group;
    }),

  // Update a group (admin only)
  update: adminProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await updateGroupService(ctx.db, input);
      logger.info(
        auditEvent(ctx, "sec.group.update", { groupId: updated.id, groupName: updated.name }),
        "Group updated",
      );
      return updated;
    }),

  // Delete a group (admin only)
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const deleted = await deleteGroupService(ctx.db, input.id);
      logger.info(
        auditEvent(ctx, "sec.group.delete", { groupId: input.id, groupName: deleted.name }),
        "Group deleted",
      );
      return deleted;
    }),

  // Add members to a group (admin only)
  addMembers: adminProcedure
    .input(
      z.object({
        groupId: z.string(),
        userIds: z.array(z.string()).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const res = await addMembersToGroup(ctx.db, input.groupId, input.userIds);
      logger.info(
        auditEvent(ctx, "sec.group.add_members", { groupId: input.groupId, addedUserIds: input.userIds }),
        "Group members added",
      );
      return res;
    }),

  // Remove members from a group (admin only)
  removeMembers: adminProcedure
    .input(
      z.object({
        groupId: z.string(),
        userIds: z.array(z.string()).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const res = await removeMembersFromGroup(ctx.db, input.groupId, input.userIds);
      logger.info(
        auditEvent(ctx, "sec.group.remove_members", { groupId: input.groupId, removedUserIds: input.userIds }),
        "Group members removed",
      );
      return res;
    }),

  // removed tag-based endpoints
});
