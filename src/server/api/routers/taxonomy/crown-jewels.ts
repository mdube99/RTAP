import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { UserRole } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createCrownJewel, updateCrownJewel, deleteCrownJewel } from "@/server/services/taxonomyService";
import { getCrownJewelUsageCount } from "@/server/services/usageService";
import { auditEvent, logger } from "@/server/logger";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== UserRole.ADMIN) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next();
});

export const crownJewelsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const items = await ctx.db.crownJewel.findMany({ orderBy: { name: "asc" } });
    const withUsage = await Promise.all(items.map(async (i) => ({ ...i, usageCount: await getCrownJewelUsageCount(ctx.db, i.id) })));
    return withUsage;
  }),

  create: adminProcedure
    .input(z.object({ name: z.string().min(1), description: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const cj = await createCrownJewel(ctx.db, input);
      logger.info(
        auditEvent(ctx, "sec.taxonomy.crownJewel.create", { id: cj.id, name: cj.name }),
        "Crown jewel created",
      );
      return cj;
    }),

  update: adminProcedure
    .input(z.object({ id: z.string(), name: z.string().min(1).optional(), description: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const updated = await updateCrownJewel(ctx.db, input);
      logger.info(
        auditEvent(ctx, "sec.taxonomy.crownJewel.update", { id: input.id, name: updated.name }),
        "Crown jewel updated",
      );
      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const res = await deleteCrownJewel(ctx.db, input.id);
      logger.info(
        auditEvent(ctx, "sec.taxonomy.crownJewel.delete", { id: input.id, name: res.name }),
        "Crown jewel deleted",
      );
      return res;
    }),
});
