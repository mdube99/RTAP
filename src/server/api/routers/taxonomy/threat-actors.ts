import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { UserRole } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createThreatActor, updateThreatActor, deleteThreatActor } from "@/server/services/threatActorService";
import { getThreatActorUsageCount } from "@/server/services/usageService";
import { auditEvent, logger } from "@/server/logger";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== UserRole.ADMIN) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next();
});

export const threatActorsRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const actors = await ctx.db.threatActor.findMany({
      include: {
        mitreTechniques: { include: { tactic: true } },
        _count: { select: { mitreTechniques: true } },
      },
      orderBy: [{ topThreat: "desc" }, { name: "asc" }],
    });
    const withUsage = await Promise.all(
      actors.map(async (a) => ({ ...a, usageCount: await getThreatActorUsageCount(ctx.db, a.id) }))
    );
    return withUsage;
  }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string(),
      topThreat: z.boolean().default(false),
      mitreTechniqueIds: z.array(z.string()).optional().default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      const ta = await createThreatActor(ctx.db, input);
      logger.info(
        auditEvent(ctx, "sec.taxonomy.threatActor.create", { id: ta.id, name: ta.name }),
        "Threat actor created",
      );
      return ta;
    }),

  update: adminProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(1).optional(),
      description: z.string().optional(),
      topThreat: z.boolean().optional(),
      mitreTechniqueIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updated = await updateThreatActor(ctx.db, input);
      logger.info(
        auditEvent(ctx, "sec.taxonomy.threatActor.update", { id: input.id, name: updated.name }),
        "Threat actor updated",
      );
      return updated;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const res = await deleteThreatActor(ctx.db, input.id);
      logger.info(
        auditEvent(ctx, "sec.taxonomy.threatActor.delete", { id: input.id, name: res.name }),
        "Threat actor deleted",
      );
      return res;
    }),
});
