import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

export const mitreRouter = createTRPCRouter({
  tactics: protectedProcedure.query(async ({ ctx }) => {
    const tactics = await ctx.db.mitreTactic.findMany();
    const { tacticOrderIndex } = await import("@/lib/mitreOrder");
    return tactics.sort((a, b) => tacticOrderIndex(a.id) - tacticOrderIndex(b.id) || a.id.localeCompare(b.id));
  }),

  techniques: protectedProcedure
    .input(z.object({ tacticId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.mitreTechnique.findMany({
        where: input.tacticId ? { tacticId: input.tacticId } : undefined,
        include: { tactic: true, subTechniques: true },
        orderBy: { name: "asc" },
      });
    }),

  subTechniques: protectedProcedure
    .input(z.object({ techniqueId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.mitreSubTechnique.findMany({
        where: { techniqueId: input.techniqueId },
        include: { technique: true },
        orderBy: { name: "asc" },
      });
    }),
});

