import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";

interface BackupData {
  version: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export const databaseBackupRouter = createTRPCRouter({
  getStats: adminProcedure.query(async ({ ctx }) => {
    const [
      userCount,
      operationCount,
      techniqueCount,
      outcomeCount,
      threatActorCount,
      crownJewelCount,
      tagCount,
      toolCount,
      logSourceCount,
      mitreTacticCount,
      mitreTechniqueCount,
      mitreSubTechniqueCount,
      groupCount,
      userGroupCount,
    ] = await Promise.all([
      ctx.db.user.count(),
      ctx.db.operation.count(),
      ctx.db.technique.count(),
      ctx.db.outcome.count(),
      ctx.db.threatActor.count(),
      ctx.db.crownJewel.count(),
      ctx.db.tag.count(),
      ctx.db.tool.count(),
      ctx.db.logSource.count(),
      ctx.db.mitreTactic.count(),
      ctx.db.mitreTechnique.count(),
      ctx.db.mitreSubTechnique.count(),
      ctx.db.group.count(),
      ctx.db.userGroup.count(),
    ]);

    return {
      users: userCount,
      operations: operationCount,
      techniques: techniqueCount,
      outcomes: outcomeCount,
      threatActors: threatActorCount,
      crownJewels: crownJewelCount,
      tags: tagCount,
      tools: toolCount,
      logSources: logSourceCount,
      mitreTactics: mitreTacticCount,
      mitreTechniques: mitreTechniqueCount,
      mitreSubTechniques: mitreSubTechniqueCount,
      groups: groupCount,
      userGroups: userGroupCount,
    };
  }),

  backup: adminProcedure
    .input(z.object({ includeTaxonomyAndOperations: z.boolean().default(true), includeUsersAndGroups: z.boolean().default(false), includeMitre: z.boolean().default(true) }).optional())
    .mutation(async ({ ctx, input }) => {
      try {
        const opts = input ?? { includeTaxonomyAndOperations: true, includeUsersAndGroups: false, includeMitre: true };
        const payload: Record<string, unknown> = {};
        const data: BackupData = { version: "1.0", timestamp: new Date().toISOString(), data: payload };

        if (opts.includeMitre) {
          payload.mitreTactics = await ctx.db.mitreTactic.findMany();
          payload.mitreTechniques = await ctx.db.mitreTechnique.findMany();
          payload.mitreSubTechniques = await ctx.db.mitreSubTechnique.findMany();
        }

        if (opts.includeTaxonomyAndOperations) {
          payload.threatActors = await ctx.db.threatActor.findMany();
          payload.crownJewels = await ctx.db.crownJewel.findMany();
          payload.tags = await ctx.db.tag.findMany();
          payload.toolCategories = await ctx.db.toolCategory.findMany();
          payload.tools = await ctx.db.tool.findMany();
          payload.logSources = await ctx.db.logSource.findMany();
          payload.operations = await ctx.db.operation.findMany({ include: { tags: true, crownJewels: true, accessGroups: { select: { groupId: true } }, } });
          payload.techniques = await ctx.db.technique.findMany({ include: { tools: true } });
          payload.outcomes = await ctx.db.outcome.findMany({ include: { tools: true, logSources: true } });
          payload.attackFlowLayouts = await ctx.db.attackFlowLayout.findMany();
          const taWithTechs = await ctx.db.threatActor.findMany({ select: { id: true, mitreTechniques: { select: { id: true } } } });
          payload.threatActorTechniqueLinks = taWithTechs.flatMap((ta) => ta.mitreTechniques.map((tech) => ({ threatActorId: ta.id, mitreTechniqueId: tech.id })));
        }

        if (opts.includeUsersAndGroups) {
          payload.users = await ctx.db.user.findMany({ select: { id: true, email: true, name: true, role: true, password: true } });
          payload.groups = await ctx.db.group.findMany({ select: { id: true, name: true, description: true } });
          payload.userGroups = await ctx.db.userGroup.findMany({ select: { userId: true, groupId: true } });
        }

        return JSON.stringify(data, null, 2);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create backup" });
      }
    }),
});
