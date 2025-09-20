import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { UserRole } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createTag, updateTag, deleteTag } from "@/server/services/taxonomyService";
import { getTagUsageCount } from "@/server/services/usageService";
import { auditEvent, logger } from "@/server/logger";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== UserRole.ADMIN) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next();
});

export const tagsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const { user } = ctx.session;
    if (user.role === UserRole.ADMIN) {
      const tags = await ctx.db.tag.findMany({
        orderBy: { name: "asc" },
        // groups no longer associated
      });
      const withUsage = await Promise.all(tags.map(async (t) => ({ ...t, usageCount: await getTagUsageCount(ctx.db, t.id) })));
      return withUsage;
    }
    // Non-admins can see all tags; tags are metadata only
    const tags = await ctx.db.tag.findMany({ orderBy: { name: "asc" } });
    return tags;
  }),

  create: adminProcedure
    .input(z.object({ name: z.string().min(1), description: z.string(), color: z.string().regex(/^#[0-9A-F]{6}$/i) }))
    .mutation(async ({ ctx, input }) => {
      const tag = await createTag(ctx.db, input);
      logger.info(auditEvent(ctx, "sec.taxonomy.tag.create", { id: tag.id, name: tag.name }), "Tag created");
      return tag;
    }),

  update: adminProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1).optional(), description: z.string().optional(), color: z.string().regex(/^#[0-9A-F]{6}$/i).optional() }))
    .mutation(async ({ ctx, input }) => {
      const updated = await updateTag(ctx.db, input);
      logger.info(auditEvent(ctx, "sec.taxonomy.tag.update", { id: input.id, name: updated.name }), "Tag updated");
      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const res = await deleteTag(ctx.db, input.id);
      logger.info(auditEvent(ctx, "sec.taxonomy.tag.delete", { id: input.id, name: res.name }), "Tag deleted");
      return res;
    }),
});
