import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { ToolType, UserRole } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createTool, updateTool, deleteTool } from "@/server/services/taxonomyService";
import { getToolUsageCount } from "@/server/services/usageService";
import { auditEvent, logger } from "@/server/logger";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== UserRole.ADMIN) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next();
});

export const toolsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const tools = await ctx.db.tool.findMany({ include: { category: true }, orderBy: [{ type: "asc" }, { category: { name: "asc" } }, { name: "asc" }] });
    const withUsage = await Promise.all(tools.map(async (t) => ({ ...t, usageCount: await getToolUsageCount(ctx.db, t.id) })));
    return withUsage;
  }),
  listByType: protectedProcedure.input(z.object({ type: z.nativeEnum(ToolType) })).query(async ({ ctx, input }) => {
    return ctx.db.tool.findMany({ where: { type: input.type }, include: { category: true }, orderBy: [{ category: { name: "asc" } }, { name: "asc" }] });
  }),
  create: adminProcedure.input(z.object({ name: z.string().min(1), categoryId: z.string(), type: z.nativeEnum(ToolType) })).mutation(async ({ ctx, input }) => {
    const tool = await createTool(ctx.db, input);
    logger.info(
      auditEvent(ctx, "sec.taxonomy.tool.create", {
        id: tool.id,
        name: tool.name,
        type: tool.type,
        categoryName: tool.category?.name,
      }),
      "Tool created",
    );
    return tool;
  }),
  update: adminProcedure.input(z.object({ id: z.string(), name: z.string().min(1).optional(), categoryId: z.string().optional(), type: z.nativeEnum(ToolType).optional() })).mutation(async ({ ctx, input }) => {
    const updated = await updateTool(ctx.db, input);
    logger.info(
      auditEvent(ctx, "sec.taxonomy.tool.update", {
        id: input.id,
        name: updated.name,
        type: updated.type,
        categoryName: updated.category?.name,
      }),
      "Tool updated",
    );
    return updated;
  }),
  delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const res = await deleteTool(ctx.db, input.id);
    logger.info(
      auditEvent(ctx, "sec.taxonomy.tool.delete", {
        id: input.id,
        name: res.name,
        type: res.type,
      }),
      "Tool deleted",
    );
    return res;
  }),
});
