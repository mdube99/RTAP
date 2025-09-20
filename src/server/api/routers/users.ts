import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { UserRole } from "@prisma/client";
import {
  createTRPCRouter,
  protectedProcedure,
  adminProcedure,
} from "@/server/api/trpc";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { createUser as createUserService, updateUser as updateUserService, defaultUserSelect } from "@/server/services/userService";
import { authenticator } from "otplib";
import { auditEvent, logger } from "@/server/logger";

export const usersRouter = createTRPCRouter({
  // List all users (Admin only)
  list: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({ select: defaultUserSelect(), orderBy: [{ role: "asc" }, { name: "asc" }] });
  }),

  // Get current user profile (any authenticated user)
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        twoFactorEnabled: true,
      },
    });
  }),

  // Create new user (Admin only)
  create: adminProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().min(1),
      password: z.string().min(6),
      role: z.nativeEnum(UserRole).default(UserRole.VIEWER),
      mustChangePassword: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const created = await createUserService(ctx.db, input);
      logger.info(
        auditEvent(ctx, "sec.user.create", {
          targetUserId: created.id,
          targetEmail: created.email,
          targetName: created.name,
        }),
        "User created",
      );
      return created;
    }),

  // Update user (Admin only)
  update: adminProcedure
    .input(z.object({
      id: z.string(),
      email: z.string().email().optional(),
      name: z.string().min(1).optional(),
      role: z.nativeEnum(UserRole).optional(),
      mustChangePassword: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { id, role } = input;
      if (id === ctx.session.user.id && role && role !== UserRole.ADMIN) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot remove admin role from your own account" });
      }
      const updated = await updateUserService(ctx.db, input);
      logger.info(
        auditEvent(ctx, "sec.user.update", {
          targetUserId: updated.id,
          targetEmail: updated.email,
          targetName: updated.name,
        }),
        "User updated",
      );
      return updated;
    }),

  // Reset user password (Admin only)
  resetPassword: adminProcedure
    .input(z.object({
      id: z.string(),
      newPassword: z.string().min(6),
    }))
    .mutation(async ({ ctx, input }) => {
      const hashedPassword = await hashPassword(input.newPassword);

      await ctx.db.user.update({
        where: { id: input.id },
        data: { password: hashedPassword, mustChangePassword: true },
      });
      // include a hint if available
      const target = await ctx.db.user.findUnique({ where: { id: input.id }, select: { email: true, name: true } });
      logger.info(
        auditEvent(ctx, "sec.user.reset_password", {
          targetUserId: input.id,
          targetEmail: target?.email,
          targetName: target?.name,
        }),
        "Admin reset user password",
      );
      return { success: true };
    }),

  // Change own password (Authenticated user)
  changeOwnPassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string().min(6),
      newPassword: z.string().min(6),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
      if (!user?.password) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
      }

      const valid = await verifyPassword(input.currentPassword, user.password);
      if (!valid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Current password is incorrect" });
      }

      const hashed = await hashPassword(input.newPassword);
      const prevMustChange = (user as { mustChangePassword?: boolean }).mustChangePassword === true;
      await ctx.db.user.update({ where: { id: user.id }, data: { password: hashed, mustChangePassword: false } });
      logger.info(auditEvent(ctx, "sec.user.change_password_self"), "User changed own password");

      return { success: true, mustChangePasswordCleared: prevMustChange };
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

  generateTotpSecret: protectedProcedure.mutation(async ({ ctx }) => {
    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(ctx.session.user.email ?? "", "TTPx", secret);
    return { secret, otpauth };
  }),

  enableTotp: protectedProcedure
    .input(z.object({ secret: z.string(), token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const isValid = authenticator.check(input.token, input.secret);
      if (!isValid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid authentication code" });
      }
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { totpSecret: input.secret, twoFactorEnabled: true },
      });
      logger.info(auditEvent(ctx, "sec.user.totp_enable"), "User enabled TOTP");
      return { success: true };
    }),

  disableTotp: protectedProcedure
    .input(z.object({ password: z.string().min(6) }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
      if (!user?.password) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not found" });
      }

      const valid = await verifyPassword(input.password, user.password);
      if (!valid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Password is incorrect" });
      }

      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { totpSecret: null, twoFactorEnabled: false },
      });
      logger.info(auditEvent(ctx, "sec.user.totp_disable"), "User disabled TOTP");
      return { success: true };
    }),

  adminDisableTotp: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.user.update({
        where: { id: input.id },
        data: { totpSecret: null, twoFactorEnabled: false },
      });
      const target = await ctx.db.user.findUnique({ where: { id: input.id }, select: { email: true, name: true } });
      logger.info(
        auditEvent(ctx, "sec.user.totp_disable_admin", {
          targetUserId: input.id,
          targetEmail: target?.email,
          targetName: target?.name,
        }),
        "Admin disabled user TOTP",
      );
      return { success: true };
    }),
});
