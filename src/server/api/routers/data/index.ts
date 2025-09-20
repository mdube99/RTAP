import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";

import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import { logger } from "@/server/logger";

const threatActorSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  topThreat: z.boolean().optional(),
});

const crownJewelSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
});

const tagSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
  color: z.string().optional(),
});

const toolCategorySchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  type: z.enum(["DEFENSIVE", "OFFENSIVE"]),
});

const toolSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  categoryId: z.string(),
  type: z.enum(["DEFENSIVE", "OFFENSIVE"]),
});

const logSourceSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  description: z.string(),
});

const operationSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  description: z.string(),
  status: z.enum(["PLANNING", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  startDate: z.coerce.date().optional().nullable(),
  endDate: z.coerce.date().optional().nullable(),
  createdById: z.string(),
  threatActorId: z.string().optional().nullable(),
  tags: z.array(z.object({ id: z.string() })).optional(),
  crownJewels: z.array(z.object({ id: z.string() })).optional(),
  visibility: z.enum(["EVERYONE", "GROUPS_ONLY"]).optional(),
});

const techniqueSchema = z.object({
  id: z.string().optional(),
  description: z.string(),
  sortOrder: z.number().int().optional(),
  startTime: z.coerce.date().optional().nullable(),
  endTime: z.coerce.date().optional().nullable(),
  sourceIp: z.string().optional().nullable(),
  targetSystem: z.string().optional().nullable(),
  crownJewelTargeted: z.boolean().optional(),
  crownJewelCompromised: z.boolean().optional(),
  executedSuccessfully: z.boolean().optional().nullable(),
  operationId: z.number(),
  mitreTechniqueId: z.string().optional().nullable(),
  mitreSubTechniqueId: z.string().optional().nullable(),
  tools: z.array(z.object({ id: z.string() })).optional(),
});

const outcomeSchema = z.object({
  id: z.string().optional(),
  type: z.enum(["DETECTION", "PREVENTION", "ATTRIBUTION"]),
  status: z.enum(["NOT_APPLICABLE", "MISSED", "DETECTED", "PREVENTED", "ATTRIBUTED"]),
  detectionTime: z.coerce.date().optional().nullable(),
  notes: z.string().optional().nullable(),
  screenshotUrl: z.string().optional().nullable(),
  logData: z.string().optional().nullable(),
  techniqueId: z.string(),
  tools: z.array(z.object({ id: z.string() })).optional(),
  logSources: z.array(z.object({ id: z.string() })).optional(),
});

const attackFlowLayoutSchema = z.object({
  id: z.string().optional(),
  operationId: z.number(),
  nodes: z.custom<Prisma.InputJsonValue>(),
  edges: z.custom<Prisma.InputJsonValue>(),
});

const threatActorTechniqueLinkSchema = z.object({
  threatActorId: z.string(),
  mitreTechniqueId: z.string(),
});

const backupPayloadSchema = z.object({
  mitreTactics: z.array(z.unknown()).optional(),
  mitreTechniques: z.array(z.unknown()).optional(),
  mitreSubTechniques: z.array(z.unknown()).optional(),
  threatActors: z.array(threatActorSchema).optional(),
  crownJewels: z.array(crownJewelSchema).optional(),
  tags: z.array(tagSchema).optional(),
  toolCategories: z.array(toolCategorySchema).optional(),
  tools: z.array(toolSchema).optional(),
  logSources: z.array(logSourceSchema).optional(),
  operations: z.array(operationSchema).optional(),
  techniques: z.array(techniqueSchema).optional(),
  outcomes: z.array(outcomeSchema).optional(),
  attackFlowLayouts: z.array(attackFlowLayoutSchema).optional(),
  threatActorTechniqueLinks: z.array(threatActorTechniqueLinkSchema).optional(),
});

const backupEnvelopeSchema = z.object({
  version: z.string(),
  timestamp: z.string(),
  data: backupPayloadSchema,
});

export const dataRouter = createTRPCRouter({
  getStats: adminProcedure.query(async ({ ctx }) => {
    const db = ctx.db;

    const [
      operationCount,
      techniqueCount,
      outcomeCount,
      threatActorCount,
      crownJewelCount,
      tagCount,
      toolCount,
      logSourceCount,
    ] = await Promise.all([
      db.operation.count(),
      db.technique.count(),
      db.outcome.count(),
      db.threatActor.count(),
      db.crownJewel.count(),
      db.tag.count(),
      db.tool.count(),
      db.logSource.count(),
    ]);

    return {
      operations: operationCount,
      techniques: techniqueCount,
      outcomes: outcomeCount,
      threatActors: threatActorCount,
      crownJewels: crownJewelCount,
      tags: tagCount,
      tools: toolCount,
      logSources: logSourceCount,
    };
  }),

  backup: adminProcedure.mutation(async ({ ctx }) => {
    const db = ctx.db;

    try {
      const [
        mitreTactics,
        mitreTechniques,
        mitreSubTechniques,
        crownJewels,
        tags,
        toolCategories,
        tools,
        logSources,
        operations,
        techniques,
        outcomes,
        attackFlowLayouts,
      ] = await Promise.all([
        db.mitreTactic.findMany(),
        db.mitreTechnique.findMany(),
        db.mitreSubTechnique.findMany(),
        db.crownJewel.findMany(),
        db.tag.findMany(),
        db.toolCategory.findMany(),
        db.tool.findMany(),
        db.logSource.findMany(),
        db.operation.findMany({
          include: {
            tags: { select: { id: true } },
            crownJewels: { select: { id: true } },
          },
        }),
        db.technique.findMany({
          include: {
            tools: { select: { id: true } },
          },
        }),
        db.outcome.findMany({
          include: {
            tools: { select: { id: true } },
            logSources: { select: { id: true } },
          },
        }),
        db.attackFlowLayout.findMany(),
      ]);

      const threatActorRows = await db.threatActor.findMany({
        include: { mitreTechniques: { select: { id: true } } },
      });

      const threatActors = threatActorRows.map(({ mitreTechniques: _mitreTechniques, ...actor }) => actor);
      const threatActorTechniqueLinks = threatActorRows.flatMap((actor) =>
        actor.mitreTechniques.map((tech) => ({
          threatActorId: actor.id,
          mitreTechniqueId: tech.id,
        })),
      );

      return JSON.stringify(
        {
          version: "2.0",
          timestamp: new Date().toISOString(),
          data: {
            mitreTactics,
            mitreTechniques,
            mitreSubTechniques,
            threatActors,
            crownJewels,
            tags,
            toolCategories,
            tools,
            logSources,
            operations,
            techniques,
            outcomes,
            attackFlowLayouts,
            threatActorTechniqueLinks,
          },
        },
        null,
        2,
      );
    } catch (error) {
      logger.error({ event: "data.backup_failed", error }, "Failed to create data backup");
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create backup" });
    }
  }),

  restore: adminProcedure
    .input(z.object({ backupData: z.string(), clearBefore: z.boolean().default(true) }))
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db;

      let raw: unknown;
      try {
        raw = JSON.parse(input.backupData);
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid backup file" });
      }

      let payload: z.infer<typeof backupPayloadSchema>;
      const parsedEnvelope = backupEnvelopeSchema.safeParse(raw);

      if (parsedEnvelope.success) {
        payload = parsedEnvelope.data.data;
      } else {
        const parsedPayload = backupPayloadSchema.safeParse(raw);
        if (!parsedPayload.success) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Backup file is missing data" });
        }
        payload = parsedPayload.data;
      }

      try {
        await db.$transaction(async (tx: Prisma.TransactionClient) => {
          if (input.clearBefore) {
            await tx.outcome.deleteMany();
            await tx.technique.deleteMany();
            await tx.attackFlowLayout.deleteMany();
            await tx.operation.deleteMany();

            await tx.tool.deleteMany();
            await tx.toolCategory.deleteMany();
            await tx.logSource.deleteMany();
            await tx.tag.deleteMany();
            await tx.crownJewel.deleteMany();
            await tx.threatActor.deleteMany();

            await tx.mitreSubTechnique.deleteMany();
            await tx.mitreTechnique.deleteMany();
            await tx.mitreTactic.deleteMany();
          }

          if (payload.mitreTactics?.length) {
            await tx.mitreTactic.createMany({ data: payload.mitreTactics as Prisma.MitreTacticCreateManyInput[] });
          }
          if (payload.mitreTechniques?.length) {
            await tx.mitreTechnique.createMany({ data: payload.mitreTechniques as Prisma.MitreTechniqueCreateManyInput[] });
          }
          if (payload.mitreSubTechniques?.length) {
            await tx.mitreSubTechnique.createMany({ data: payload.mitreSubTechniques as Prisma.MitreSubTechniqueCreateManyInput[] });
          }

          if (payload.threatActors?.length) {
            await tx.threatActor.createMany({ data: payload.threatActors });
          }
          if (payload.crownJewels?.length) {
            await tx.crownJewel.createMany({ data: payload.crownJewels });
          }
          if (payload.tags?.length) {
            await tx.tag.createMany({ data: payload.tags });
          }
          if (payload.toolCategories?.length) {
            await tx.toolCategory.createMany({ data: payload.toolCategories });
          }
          if (payload.tools?.length) {
            await tx.tool.createMany({ data: payload.tools });
          }
          if (payload.logSources?.length) {
            await tx.logSource.createMany({ data: payload.logSources });
          }

          for (const op of payload.operations ?? []) {
            const { tags: opTags = [], crownJewels: opCrownJewels = [], visibility: opVisibility, ...operationFields } = op;

            await tx.operation.create({
              data: {
                ...operationFields,
                visibility: opVisibility ?? "EVERYONE",
                tags: opTags.length ? { connect: opTags.map(({ id }) => ({ id })) } : undefined,
                crownJewels: opCrownJewels.length ? { connect: opCrownJewels.map(({ id }) => ({ id })) } : undefined,
              },
            });
          }

          for (const technique of payload.techniques ?? []) {
            const { tools: techniqueTools = [], ...techniqueFields } = technique;

            await tx.technique.create({
              data: {
                ...techniqueFields,
                tools: techniqueTools.length ? { connect: techniqueTools.map(({ id }) => ({ id })) } : undefined,
              },
            });
          }

          for (const outcome of payload.outcomes ?? []) {
            const { tools: outcomeTools = [], logSources: outcomeLogSources = [], ...outcomeFields } = outcome;

            await tx.outcome.create({
              data: {
                ...outcomeFields,
                tools: outcomeTools.length ? { connect: outcomeTools.map(({ id }) => ({ id })) } : undefined,
                logSources: outcomeLogSources.length ? { connect: outcomeLogSources.map(({ id }) => ({ id })) } : undefined,
              },
            });
          }

          for (const layout of payload.attackFlowLayouts ?? []) {
            await tx.attackFlowLayout.create({ data: layout });
          }

          for (const link of payload.threatActorTechniqueLinks ?? []) {
            await tx.threatActor.update({
              where: { id: link.threatActorId },
              data: { mitreTechniques: { connect: { id: link.mitreTechniqueId } } },
            });
          }
        });

        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error({ event: "data.restore_failed", message }, "Restore error");
        throw new TRPCError({ code: "BAD_REQUEST", message: "Failed to restore backup" });
      }
    }),

  clearData: adminProcedure
    .input(z.object({ clearOperations: z.boolean(), clearTaxonomy: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const db = ctx.db;

      try {
        await db.$transaction(async (tx: Prisma.TransactionClient) => {
          if (input.clearOperations) {
            await tx.outcome.deleteMany();
            await tx.technique.deleteMany();
            await tx.attackFlowLayout.deleteMany();
            await tx.operation.deleteMany();
          }

          if (input.clearTaxonomy) {
            await tx.tool.deleteMany();
            await tx.toolCategory.deleteMany();
            await tx.logSource.deleteMany();
            await tx.tag.deleteMany();
            await tx.crownJewel.deleteMany();
            await tx.threatActor.deleteMany();
          }
        });

        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error({ event: "data.clear_failed", message }, "Clear data error");
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to clear data" });
      }
    }),
});
