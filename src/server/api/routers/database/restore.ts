import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { createTRPCRouter, adminProcedure } from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { logger } from "@/server/logger";

const threatActorSchema = z.object({ id: z.string().optional(), name: z.string(), description: z.string(), topThreat: z.boolean().optional() });
const crownJewelSchema = z.object({ id: z.string().optional(), name: z.string(), description: z.string() });
const tagSchema = z.object({ id: z.string().optional(), name: z.string(), description: z.string(), color: z.string().optional() });
const toolCategorySchema = z.object({ id: z.string().optional(), name: z.string(), type: z.enum(["DEFENSIVE", "OFFENSIVE"]) });
const toolSchema = z.object({ id: z.string().optional(), name: z.string(), categoryId: z.string(), type: z.enum(["DEFENSIVE", "OFFENSIVE"]) });
const logSourceSchema = z.object({ id: z.string().optional(), name: z.string(), description: z.string() });
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
  accessGroups: z.array(z.object({ groupId: z.string() })).optional(),
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
const attackFlowLayoutSchema = z.object({ id: z.string().optional(), operationId: z.number(), nodes: z.custom<Prisma.InputJsonValue>(), edges: z.custom<Prisma.InputJsonValue>() });
const threatActorTechniqueLinkSchema = z.object({ threatActorId: z.string(), mitreTechniqueId: z.string() });
const authenticatorSchema = z.object({
  id: z.string().optional(),
  credentialID: z.string(),
  userId: z.string(),
  providerAccountId: z.string(),
  credentialPublicKey: z.string(),
  counter: z.number(),
  credentialDeviceType: z.string(),
  credentialBackedUp: z.boolean(),
  transports: z.string().optional().nullable(),
});

const backupPayloadSchema = z.object({
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
  users: z.array(z.object({
    id: z.string().optional(),
    email: z.string().email(),
    name: z.string().nullable().optional(),
    role: z.enum(["ADMIN", "OPERATOR", "VIEWER"]).optional(),
    lastLogin: z.coerce.date().optional().nullable(),
  })).optional(),
  authenticators: z.array(authenticatorSchema).optional(),
  groups: z.array(z.object({ id: z.string().optional(), name: z.string(), description: z.string() })).optional(),
  userGroups: z.array(z.object({ userId: z.string(), groupId: z.string() })).optional(),
  mitreTactics: z.array(z.unknown()).optional(),
  mitreTechniques: z.array(z.unknown()).optional(),
  mitreSubTechniques: z.array(z.unknown()).optional(),
});

type BackupPayload = z.infer<typeof backupPayloadSchema>;

export const databaseRestoreRouter = createTRPCRouter({
  restore: adminProcedure
    .input(z.object({ backupData: z.string(), restoreTaxonomyAndOperations: z.boolean().default(true), restoreUsersAndGroups: z.boolean().default(false), clearBefore: z.boolean().default(true) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const data = JSON.parse(input.backupData) as { version?: string; data?: unknown };
        if (!data.version || !data.data) throw new Error("Invalid backup format");
        if (!input.restoreTaxonomyAndOperations && !input.restoreUsersAndGroups) throw new Error("Select at least one section to restore");
        if (input.restoreTaxonomyAndOperations && !input.clearBefore) throw new Error("Restoring taxonomy and operations requires clearing existing data first");

        if (input.clearBefore && input.restoreTaxonomyAndOperations) {
          await ctx.db.$transaction(async (tx) => {
            await tx.outcome.deleteMany();
            await tx.technique.deleteMany();
            await tx.operation.deleteMany();
            await tx.tool.deleteMany();
            await tx.toolCategory.deleteMany();
            await tx.logSource.deleteMany();
            await tx.tag.deleteMany();
            await tx.crownJewel.deleteMany();
            await tx.threatActor.deleteMany();
          });
        }

        const payload: BackupPayload = backupPayloadSchema.parse(data.data);

        await ctx.db.$transaction(async (tx) => {
          if (input.restoreUsersAndGroups) {
            if (payload.users?.length) {
              for (const user of payload.users) {
                await tx.user.upsert({
                  where: { email: user.email },
                  update: {
                    name: user.name ?? undefined,
                    role: user.role ?? undefined,
                    lastLogin: user.lastLogin ?? undefined,
                  },
                  create: {
                    email: user.email,
                    name: user.name ?? null,
                    role: user.role ?? "VIEWER",
                    lastLogin: user.lastLogin ?? null,
                  },
                });
              }
            }

            if (payload.authenticators) {
              await tx.authenticator.deleteMany();
              for (const auth of payload.authenticators) {
                await tx.authenticator.create({
                  data: {
                    id: auth.id,
                    credentialID: auth.credentialID,
                    userId: auth.userId,
                    providerAccountId: auth.providerAccountId,
                    credentialPublicKey: auth.credentialPublicKey,
                    counter: auth.counter,
                    credentialDeviceType: auth.credentialDeviceType,
                    credentialBackedUp: auth.credentialBackedUp,
                    transports: auth.transports ?? null,
                  },
                });
              }
            }

            if (payload.groups?.length) {
              for (const group of payload.groups) {
                await tx.group.upsert({
                  where: group.id ? { id: group.id } : { name: group.name },
                  update: {
                    name: group.name,
                    description: group.description,
                  },
                  create: {
                    ...(group.id ? { id: group.id } : {}),
                    name: group.name,
                    description: group.description,
                  },
                });
              }
            }
          }

          if (input.restoreTaxonomyAndOperations) {
            if (payload.threatActors?.length) await tx.threatActor.createMany({ data: payload.threatActors });
            if (payload.crownJewels?.length) await tx.crownJewel.createMany({ data: payload.crownJewels });
            if (payload.tags?.length) await tx.tag.createMany({ data: payload.tags });
            if (payload.toolCategories?.length) await tx.toolCategory.createMany({ data: payload.toolCategories });
            if (payload.tools?.length) await tx.tool.createMany({ data: payload.tools });
            if (payload.logSources?.length) await tx.logSource.createMany({ data: payload.logSources });

            const accessGroupIds = new Set<string>();
            for (const op of payload.operations ?? []) {
              for (const ag of op.accessGroups ?? []) {
                accessGroupIds.add(ag.groupId);
              }
            }

            if (accessGroupIds.size > 0) {
              const groups = await tx.group.findMany({ where: { id: { in: Array.from(accessGroupIds) } } });
              if (groups.length !== accessGroupIds.size) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: "One or more groups referenced by operations are missing. Restore groups before operations.",
                });
              }
            }

            for (const op of payload.operations ?? []) {
              const {
                tags: opTags = [],
                crownJewels: opCrownJewels = [],
                accessGroups: opAccessGroups,
                visibility: opVisibility,
                ...operationFields
              } = op;

              const created = await tx.operation.create({
                data: {
                  ...operationFields,
                  visibility: opVisibility ?? "EVERYONE",
                  tags: opTags.length ? { connect: opTags.map(({ id }) => ({ id })) } : undefined,
                  crownJewels: opCrownJewels.length ? { connect: opCrownJewels.map(({ id }) => ({ id })) } : undefined,
                },
              });

              if (opAccessGroups?.length) {
                await tx.operationAccessGroup.createMany({
                  data: opAccessGroups.map(({ groupId }) => ({ operationId: created.id, groupId })),
                });
              }
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
              const {
                tools: outcomeTools = [],
                logSources: outcomeLogSources = [],
                ...outcomeFields
              } = outcome;

              await tx.outcome.create({
                data: {
                  ...outcomeFields,
                  tools: outcomeTools.length ? { connect: outcomeTools.map(({ id }) => ({ id })) } : undefined,
                  logSources: outcomeLogSources.length ? { connect: outcomeLogSources.map(({ id }) => ({ id })) } : undefined,
                },
              });
            }

            for (const layoutRecord of payload.attackFlowLayouts ?? []) {
              await tx.attackFlowLayout.upsert({
                where: { operationId: layoutRecord.operationId },
                update: { nodes: layoutRecord.nodes, edges: layoutRecord.edges },
                create: {
                  operationId: layoutRecord.operationId,
                  nodes: layoutRecord.nodes,
                  edges: layoutRecord.edges,
                },
              });
            }

            for (const linkRecord of payload.threatActorTechniqueLinks ?? []) {
              await tx.threatActor.update({
                where: { id: linkRecord.threatActorId },
                data: { mitreTechniques: { connect: { id: linkRecord.mitreTechniqueId } } },
              });
            }
          }

          if (input.restoreUsersAndGroups) {
            for (const membership of payload.userGroups ?? []) {
              const userExists = await tx.user.findUnique({ where: { id: membership.userId } });
              const groupExists = await tx.group.findUnique({ where: { id: membership.groupId } });
              if (!userExists || !groupExists) continue;
              await tx.userGroup.upsert({
                where: { userId_groupId: { userId: membership.userId, groupId: membership.groupId } },
                update: {},
                create: { userId: membership.userId, groupId: membership.groupId },
              });
            }
          }
        });

        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error({ event: "database.restore_failed", message }, "Restore error");
        throw new TRPCError({ code: "BAD_REQUEST", message: error instanceof Error ? error.message : "Failed to restore backup" });
      }
    }),

  clearData: adminProcedure
    .input(z.object({ clearOperations: z.boolean(), clearTaxonomy: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.db.$transaction(async (tx) => {
          if (input.clearOperations) {
            await tx.outcome.deleteMany();
            await tx.technique.deleteMany();
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
        logger.error({ event: "database.clear_failed", message }, "Clear data error");
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to clear data" });
      }
    }),
});
