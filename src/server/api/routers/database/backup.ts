import { z } from "zod";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import type { AuthedContext } from "@/server/api/trpc";
import type { DatabaseClient } from "@/server/db";
import { TRPCError } from "@trpc/server";

interface BackupData {
  version: string;
  timestamp: string;
  data: Record<string, unknown>;
}

const isDatabaseClient = (value: unknown): value is DatabaseClient => {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as {
    user?: { findMany?: unknown };
    operation?: { findMany?: unknown };
  };

  return typeof candidate.user?.findMany === "function" && typeof candidate.operation?.findMany === "function";
};

const getPrismaClient = (value: unknown): DatabaseClient => {
  if (!isDatabaseClient(value)) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database client not initialized" });
  }
  return value;
};

export const databaseBackupRouter = createTRPCRouter({
  getStats: adminProcedure.query(async ({ ctx }: { ctx: AuthedContext }) => {
    const db = getPrismaClient(ctx.db);
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
      db.user.count(),
      db.operation.count(),
      db.technique.count(),
      db.outcome.count(),
      db.threatActor.count(),
      db.crownJewel.count(),
      db.tag.count(),
      db.tool.count(),
      db.logSource.count(),
      db.mitreTactic.count(),
      db.mitreTechnique.count(),
      db.mitreSubTechnique.count(),
      db.group.count(),
      db.userGroup.count(),
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
    .mutation(async ({ ctx, input }: { ctx: AuthedContext; input: { includeTaxonomyAndOperations?: boolean; includeUsersAndGroups?: boolean; includeMitre?: boolean } | undefined }) => {
      const db = getPrismaClient(ctx.db);
      try {
        const opts = input ?? { includeTaxonomyAndOperations: true, includeUsersAndGroups: false, includeMitre: true };
        const payload: Record<string, unknown> = {};
        const data: BackupData = { version: "1.0", timestamp: new Date().toISOString(), data: payload };

        if (opts.includeMitre) {
          payload.mitreTactics = await db.mitreTactic.findMany();
          payload.mitreTechniques = await db.mitreTechnique.findMany();
          payload.mitreSubTechniques = await db.mitreSubTechnique.findMany();
        }

        if (opts.includeTaxonomyAndOperations) {
          payload.threatActors = await db.threatActor.findMany();
          payload.crownJewels = await db.crownJewel.findMany();
          payload.tags = await db.tag.findMany();
          payload.toolCategories = await db.toolCategory.findMany();
          payload.tools = await db.tool.findMany();
          payload.logSources = await db.logSource.findMany();
          payload.operations = await db.operation.findMany({ include: { tags: true, crownJewels: true, accessGroups: { select: { groupId: true } }, } });
          payload.techniques = await db.technique.findMany({ include: { tools: true } });
          payload.outcomes = await db.outcome.findMany({ include: { tools: true, logSources: true } });
          payload.attackFlowLayouts = await db.attackFlowLayout.findMany();
          const taWithTechs = await db.threatActor.findMany({ select: { id: true, mitreTechniques: { select: { id: true } } } });
          payload.threatActorTechniqueLinks = taWithTechs.flatMap((ta) => ta.mitreTechniques.map((tech) => ({ threatActorId: ta.id, mitreTechniqueId: tech.id })));
        }

        if (opts.includeUsersAndGroups) {
          payload.users = await db.user.findMany({ select: { id: true, email: true, name: true, role: true, lastLogin: true } });
          payload.authenticators = await db.authenticator.findMany();
          payload.groups = await db.group.findMany({ select: { id: true, name: true, description: true } });
          payload.userGroups = await db.userGroup.findMany({ select: { userId: true, groupId: true } });
        }

        return JSON.stringify(data, null, 2);
      } catch {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create backup" });
      }
    }),
});
