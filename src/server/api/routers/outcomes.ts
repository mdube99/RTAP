import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  viewerProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { OutcomeType, OutcomeStatus } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import {
  checkOperationAccess,
  getAccessibleOperationFilter,
} from "@/server/api/access";
import {
  bulkCreateOutcomes,
  defaultOutcomeInclude,
  createOutcome as createOutcomeService,
  updateOutcome as updateOutcomeService,
  deleteOutcome as deleteOutcomeService,
} from "@/server/services/outcomeService";
import { utcDateOptional } from "@/lib/utcValidators";

// Input validation schemas
const createOutcomeSchema = z.object({
  techniqueId: z.string(),
  type: z.nativeEnum(OutcomeType),
  status: z.nativeEnum(OutcomeStatus),
  detectionTime: utcDateOptional,
  notes: z.string().optional(),
  screenshotUrl: z.string().optional(),
  logData: z.string().optional(),
  toolIds: z.array(z.string()).optional(),
  logSourceIds: z.array(z.string()).optional(),
});

const updateOutcomeSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(OutcomeType).optional(),
  status: z.nativeEnum(OutcomeStatus).optional(),
  detectionTime: utcDateOptional,
  notes: z.string().optional(),
  screenshotUrl: z.string().optional(),
  logData: z.string().optional(),
  toolIds: z.array(z.string()).optional(),
  logSourceIds: z.array(z.string()).optional(),
});

const getOutcomeSchema = z.object({
  id: z.string(),
});

const listOutcomesSchema = z.object({
  techniqueId: z.string().optional(),
  operationId: z.number().optional(),
  type: z.nativeEnum(OutcomeType).optional(),
  status: z.nativeEnum(OutcomeStatus).optional(),
  limit: z.number().min(1).max(100).default(50),
  cursor: z.string().optional(),
});

// Access filter centralized in @/server/api/access

export const outcomesRouter = createTRPCRouter({
  // Create a new outcome for a technique
  create: protectedProcedure
    .input(createOutcomeSchema)
    .mutation(async ({ ctx, input }) => {
      const technique = await ctx.db.technique.findUnique({
        where: { id: input.techniqueId },
        select: { operationId: true },
      });

      if (!technique) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Technique not found",
        });
      }

      const hasAccess = await checkOperationAccess(
        ctx,
        technique.operationId,
        "modify",
      );
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to modify this operation",
        });
      }

      return createOutcomeService(ctx.db, input);
    }),

  // Update outcome
  update: protectedProcedure
    .input(updateOutcomeSchema)
    .mutation(async ({ ctx, input }) => {
      const outcome = await ctx.db.outcome.findUnique({
        where: { id: input.id },
        include: {
          technique: {
            select: { operationId: true },
          },
        },
      });

      if (!outcome) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Outcome not found",
        });
      }

      const hasAccess = await checkOperationAccess(
        ctx,
        outcome.technique.operationId,
        "modify",
      );
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to modify this operation",
        });
      }

      return updateOutcomeService(ctx.db, input);
    }),

  // Delete outcome
  delete: protectedProcedure
    .input(getOutcomeSchema)
    .mutation(async ({ ctx, input }) => {
      const outcome = await ctx.db.outcome.findUnique({
        where: { id: input.id },
        include: {
          technique: {
            select: { operationId: true },
          },
        },
      });

      if (!outcome) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Outcome not found",
        });
      }

      const hasAccess = await checkOperationAccess(
        ctx,
        outcome.technique.operationId,
        "modify",
      );
      if (!hasAccess) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to delete this outcome",
        });
      }

      return deleteOutcomeService(ctx.db, input.id);
    }),

  // Bulk create outcomes for multiple techniques
  bulkCreate: protectedProcedure
    .input(
      z.object({
        outcomes: z.array(createOutcomeSchema),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const techniqueIds = Array.from(
        new Set(input.outcomes.map((o) => o.techniqueId)),
      );
      const techniques = await ctx.db.technique.findMany({
        where: { id: { in: techniqueIds } },
        select: { id: true, operationId: true },
      });

      if (techniques.length !== techniqueIds.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "One or more techniques not found",
        });
      }

      const operationIds = Array.from(
        new Set(techniques.map((t) => t.operationId)),
      );
      await Promise.all(
        operationIds.map(async (operationId) => {
          const hasAccess = await checkOperationAccess(
            ctx,
            operationId,
            "modify",
          );
          if (!hasAccess) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You don't have permission to modify this operation",
            });
          }
        }),
      );

      return bulkCreateOutcomes(ctx.db, input.outcomes);
    }),

  // List outcomes (with access control)
  list: viewerProcedure
    .input(listOutcomesSchema)
    .query(async ({ ctx, input }) => {
      const { techniqueId, operationId, type, status, limit, cursor } = input;
      const accessFilter = getAccessibleOperationFilter(ctx);

      // Build where clause for outcomes through accessible operations
      const where: Prisma.OutcomeWhereInput = {
        technique: {
          operation: accessFilter,
          ...(operationId ? { operationId } : {}),
        },
        ...(techniqueId ? { techniqueId } : {}),
        ...(type ? { type } : {}),
        ...(status ? { status } : {}),
      };

      // Get outcomes with cursor-based pagination
      const outcomes = await ctx.db.outcome.findMany({
        where,
        take: limit + 1, // Take one extra to determine if there are more
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: defaultOutcomeInclude(),
      });

      // Handle pagination
      let nextCursor: string | undefined = undefined;
      if (outcomes.length > limit) {
        const nextItem = outcomes.pop(); // Remove the extra item
        nextCursor = nextItem!.id;
      }

      return {
        outcomes: outcomes.map((o) => ({
          ...o,
          detectionTime: o.detectionTime?.toISOString() ?? null,
        })),
        nextCursor,
      };
    }),

  // Get outcome by ID (with access control)
  getById: viewerProcedure
    .input(getOutcomeSchema)
    .query(async ({ ctx, input }) => {
      const accessFilter = getAccessibleOperationFilter(ctx);

      const outcome = await ctx.db.outcome.findFirst({
        where: {
          id: input.id,
          technique: {
            operation: accessFilter,
          },
        },
        include: defaultOutcomeInclude(),
      });

      if (!outcome) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Outcome not found",
        });
      }

      return {
        ...outcome,
        detectionTime: outcome.detectionTime?.toISOString() ?? null,
      };
    }),
});
