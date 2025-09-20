import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { ToolType, UserRole } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createToolCategory, updateToolCategory, deleteToolCategory } from "@/server/services/taxonomyService";
import { getToolCategoryUsageCount } from "@/server/services/usageService";
import { auditEvent, logger } from "@/server/logger";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== UserRole.ADMIN) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next();
});

export const toolCategoriesRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const cats = await ctx.db.toolCategory.findMany({ include: { _count: { select: { tools: true } } }, orderBy: [{ type: "asc" }, { name: "asc" }] });
    const withUsage = await Promise.all(cats.map(async (c) => ({ ...c, usageCount: await getToolCategoryUsageCount(ctx.db, c.id) })));
    return withUsage;
  }),
  listByType: protectedProcedure.input(z.object({ type: z.nativeEnum(ToolType) })).query(async ({ ctx, input }) => {
    const cats = await ctx.db.toolCategory.findMany({ where: { type: input.type }, include: { _count: { select: { tools: true } } }, orderBy: { name: "asc" } });
    const withUsage = await Promise.all(cats.map(async (c) => ({ ...c, usageCount: await getToolCategoryUsageCount(ctx.db, c.id) })));
    return withUsage;
  }),
  create: adminProcedure.input(z.object({ name: z.string().min(1), type: z.nativeEnum(ToolType) })).mutation(async ({ ctx, input }) => {
    const cat = await createToolCategory(ctx.db, input);
    logger.info(
      auditEvent(ctx, "sec.taxonomy.toolCategory.create", { id: cat.id, name: cat.name, type: cat.type }),
      "Tool category created",
    );
    return cat;
  }),
  update: adminProcedure.input(z.object({ id: z.string(), name: z.string().min(1).optional() })).mutation(async ({ ctx, input }) => {
    const updated = await updateToolCategory(ctx.db, input);
    logger.info(
      auditEvent(ctx, "sec.taxonomy.toolCategory.update", { id: input.id, name: updated.name }),
      "Tool category updated",
    );
    return updated;
  }),
  delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const res = await deleteToolCategory(ctx.db, input.id);
    logger.info(
      auditEvent(ctx, "sec.taxonomy.toolCategory.delete", { id: input.id, name: res.name }),
      "Tool category deleted",
    );
    return res;
  }),
});
