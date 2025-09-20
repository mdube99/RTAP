import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { UserRole } from "@prisma/client";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import { createUser as createUserService, updateUser as updateUserService, defaultUserSelect } from "@/server/services/userService";
import { auditEvent, logger } from "@/server/logger";
import { createLoginLink } from "@/server/auth/login-link";

function mapUser<T extends { _count: { authenticators: number } }>(user: T) {
  const { _count, ...rest } = user;
  return { ...rest, passkeyCount: _count.authenticators };
}

export const usersRouter = createTRPCRouter({
  // List all users (Admin only)
  list: adminProcedure.query(async ({ ctx }) => {
    const users = await ctx.db.user.findMany({ select: defaultUserSelect(), orderBy: [{ role: "asc" }, { name: "asc" }] });
    return users.map(mapUser);
  }),

  // Get current user profile (any authenticated user)
  me: protectedProcedure.query(async ({ ctx }) => {
    const me = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        lastLogin: true,
        _count: { select: { authenticators: true } },
      },
    });
    if (!me) throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
    return mapUser(me);
  }),

  // Create new user (Admin only)
  create: adminProcedure
    .input(z.object({
      email: z.string().trim().email(),
      name: z.string().min(1),
      role: z.nativeEnum(UserRole).default(UserRole.VIEWER),
    }))
    .mutation(async ({ ctx, input }) => {
      const created = await createUserService(ctx.db, input);
      const loginLink = await createLoginLink(ctx.db, { email: created.email });
      const user = mapUser(created);
      logger.info(
        auditEvent(ctx, "sec.user.create", {
          targetUserId: user.id,
          targetEmail: user.email,
          targetName: user.name,
        }),
        "User created",
      );
      return { user, loginLink };
    }),

  // Update user (Admin only)
  update: adminProcedure
    .input(z.object({
      id: z.string(),
      email: z.string().trim().email().optional(),
      name: z.string().min(1).optional(),
      role: z.nativeEnum(UserRole).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, role } = input;
      if (id === ctx.session.user.id && role && role !== UserRole.ADMIN) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot remove admin role from your own account" });
      }
      const updated = await updateUserService(ctx.db, input);
      const user = mapUser(updated);
      logger.info(
        auditEvent(ctx, "sec.user.update", {
          targetUserId: user.id,
          targetEmail: user.email,
          targetName: user.name,
        }),
        "User updated",
      );
      return user;
    }),

  // Delete user (Admin only)
  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Prevent admin from deleting their own account
      if (input.id === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete your own account",
        });
      }

      // Check if user has created operations
      const operationsCount = await ctx.db.operation.count({
        where: { createdById: input.id },
      });

      if (operationsCount > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete user: ${operationsCount} operation(s) were created by this user`,
        });
      }

      const deleted = await ctx.db.user.delete({
        where: { id: input.id },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });
      logger.info(
        auditEvent(ctx, "sec.user.delete", {
          targetUserId: deleted.id,
          targetEmail: deleted.email,
          targetName: deleted.name,
        }),
        "User deleted",
      );
      return deleted;
    }),

  issueLoginLink: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: input.id }, select: { id: true, email: true, name: true } });
      if (!user?.email) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      const loginLink = await createLoginLink(ctx.db, { email: user.email });
      logger.info(
        auditEvent(ctx, "sec.user.login_link_issue", {
          targetUserId: user.id,
          targetEmail: user.email,
          targetName: user.name,
        }),
        "Admin issued user login link",
      );
      return loginLink;
    }),

  // Get user statistics (Admin only)
  stats: adminProcedure.query(async ({ ctx }) => {
    const [totalUsers, adminCount, operatorCount, viewerCount] = await Promise.all([
      ctx.db.user.count(),
      ctx.db.user.count({ where: { role: UserRole.ADMIN } }),
      ctx.db.user.count({ where: { role: UserRole.OPERATOR } }),
      ctx.db.user.count({ where: { role: UserRole.VIEWER } }),
    ]);

    return {
      totalUsers,
      adminCount,
      operatorCount,
      viewerCount,
    };
  }),

});
