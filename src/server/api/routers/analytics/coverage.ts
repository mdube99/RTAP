import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { OutcomeType } from "@prisma/client";
import { createTRPCRouter, viewerProcedure } from "@/server/api/trpc";
import { getAccessibleOperationFilter } from "@/server/api/access";
import { utcDateString } from "@/lib/utcValidators";

export const coverageRouter = createTRPCRouter({
  // Executed sub-techniques across accessible operations (for UI expansion)
  subTechniqueUsage: viewerProcedure
    .meta({
      description:
        "List executed MITRE sub-techniques across accessible operations",
    })
    .query(async ({ ctx }) => {
      const accessFilter = getAccessibleOperationFilter(ctx);
      const techniques = await ctx.db.technique.findMany({
        where: {
          operation: accessFilter,
          mitreSubTechniqueId: { not: null },
          startTime: { not: null },
        },
        select: { mitreSubTechniqueId: true },
      });
      const counts = new Map<string, number>();
      techniques.forEach((t) => {
        const id = t.mitreSubTechniqueId!;
        counts.set(id, (counts.get(id) ?? 0) + 1);
      });
      return Array.from(counts.entries()).map(([subTechniqueId, count]) => ({
        subTechniqueId,
        count,
      }));
    }),

  // MITRE Tactic Coverage Heatmap
  byTactic: viewerProcedure
    .meta({
      description:
        "Get MITRE ATT&CK tactic coverage metrics with detection/prevention/attribution rates",
    })
    .input(
      z.object({
        start: utcDateString,
        end: utcDateString,
        tagIds: z.array(z.string()).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const accessFilter = getAccessibleOperationFilter(ctx);

      const filters: Prisma.OperationWhereInput = {
        ...accessFilter,
        ...(input.tagIds?.length
          ? { tags: { some: { id: { in: input.tagIds } } } }
          : {}),
        OR: [
          {
            startDate: { gte: new Date(input.start), lte: new Date(input.end) },
          },
          {
            startDate: null,
            createdAt: { gte: new Date(input.start), lte: new Date(input.end) },
          },
        ],
      };

      // 1) Pre-seed with ALL MITRE tactics so we always return the full dataset
      const allTactics = await ctx.db.mitreTactic.findMany({
        orderBy: { id: "asc" },
      });
      const tacticMap = new Map<
        string,
        {
          tacticId: string;
          tacticName: string;
          plannedTechniques: Set<string>;
          executedTechniques: Set<string>;
          executedAttempts: number;
          operations: Set<number>;
          detectionAttempts: number;
          detectionSuccesses: number;
          preventionAttempts: number;
          preventionSuccesses: number;
          attributionAttempts: number;
          attributionSuccesses: number;
        }
      >();
      allTactics.forEach((t) => {
        tacticMap.set(t.id, {
          tacticId: t.id,
          tacticName: t.name,
          plannedTechniques: new Set(),
          executedTechniques: new Set(),
          executedAttempts: 0,
          operations: new Set<number>(),
          detectionAttempts: 0,
          detectionSuccesses: 0,
          preventionAttempts: 0,
          preventionSuccesses: 0,
          attributionAttempts: 0,
          attributionSuccesses: 0,
        });
      });

      // 2) Overlay executed techniques/outcomes from accessible operations
      const techniques = await ctx.db.technique.findMany({
        include: {
          mitreTechnique: { include: { tactic: true } },
          operation: { select: { id: true, name: true, status: true } },
          outcomes: true,
        },
        where: { operation: filters },
      });

      techniques.forEach((technique) => {
        const tactic = technique.mitreTechnique?.tactic;
        if (!tactic) return;
        const entry = tacticMap.get(tactic.id);
        if (!entry) return;

        if (technique.mitreTechniqueId) {
          entry.plannedTechniques.add(technique.mitreTechniqueId);
          if (technique.startTime) {
            entry.executedTechniques.add(technique.mitreTechniqueId);
            entry.executedAttempts += 1;
          }
        }
        entry.operations.add(technique.operationId);

        technique.outcomes.forEach((outcome) => {
          if (outcome.status === "NOT_APPLICABLE") return;
          switch (outcome.type) {
            case OutcomeType.DETECTION:
              entry.detectionAttempts++;
              if (outcome.status === "DETECTED") entry.detectionSuccesses++;
              break;
            case OutcomeType.PREVENTION:
              entry.preventionAttempts++;
              if (outcome.status === "PREVENTED") entry.preventionSuccesses++;
              break;
            case OutcomeType.ATTRIBUTION:
              entry.attributionAttempts++;
              if (outcome.status === "ATTRIBUTED") entry.attributionSuccesses++;
              break;
          }
        });
      });

      const list = Array.from(tacticMap.values()).map((t) => ({
        tacticId: t.tacticId,
        tacticName: t.tacticName,
        plannedCount: t.plannedTechniques.size,
        executedCount: t.executedTechniques.size,
        executedAttemptCount: t.executedAttempts,
        operationCount: t.operations.size,
        detectionRate:
          t.detectionAttempts > 0
            ? Math.round((t.detectionSuccesses / t.detectionAttempts) * 100)
            : null,
        detectionCount: t.detectionAttempts,
        preventionRate:
          t.preventionAttempts > 0
            ? Math.round((t.preventionSuccesses / t.preventionAttempts) * 100)
            : null,
        preventionCount: t.preventionAttempts,
        attributionRate:
          t.attributionAttempts > 0
            ? Math.round((t.attributionSuccesses / t.attributionAttempts) * 100)
            : null,
        attributionCount: t.attributionAttempts,
      }));
      // Sort using canonical order
      const { tacticOrderIndex } = await import("@/lib/mitreOrder");
      return list.sort(
        (a, b) =>
          tacticOrderIndex(a.tacticId) - tacticOrderIndex(b.tacticId) ||
          a.tacticId.localeCompare(b.tacticId),
      );
    }),

  // MITRE Sub-technique metrics (for expanded analytics view)
  subTechniqueMetrics: viewerProcedure
    .meta({
      description:
        "Get execution metrics for MITRE sub-techniques across accessible operations",
    })
    .query(async ({ ctx }) => {
      const accessFilter = getAccessibleOperationFilter(ctx);
      const executed = await ctx.db.technique.findMany({
        where: {
          operation: accessFilter,
          mitreSubTechniqueId: { not: null },
        },
        include: {
          mitreSubTechnique: {
            include: { technique: { include: { tactic: true } } },
          },
          outcomes: true,
        },
      });

      type Agg = {
        count: number;
        detectionSuccess: number;
        detectionTotal: number;
        preventionSuccess: number;
        preventionTotal: number;
        attributionSuccess: number;
        attributionTotal: number;
        subName: string;
        techId: string;
        techName: string;
        tacticId: string;
        tacticName: string;
      };

      const map = new Map<string, Agg>();
      for (const t of executed) {
        const st = t.mitreSubTechnique;
        if (!st) continue;
        const key = st.id;
        if (!map.has(key)) {
          map.set(key, {
            count: 0,
            detectionSuccess: 0,
            detectionTotal: 0,
            preventionSuccess: 0,
            preventionTotal: 0,
            attributionSuccess: 0,
            attributionTotal: 0,
            subName: st.name,
            techId: st.techniqueId,
            techName: st.technique.name,
            tacticId: st.technique.tactic.id,
            tacticName: st.technique.tactic.name,
          });
        }
        const agg = map.get(key)!;
        agg.count++;
        for (const o of t.outcomes) {
          if (o.status === "NOT_APPLICABLE") continue;
          if (o.type === "DETECTION") {
            agg.detectionTotal++;
            if (o.status === "DETECTED") agg.detectionSuccess++;
          } else if (o.type === "PREVENTION") {
            agg.preventionTotal++;
            if (o.status === "PREVENTED") agg.preventionSuccess++;
          } else if (o.type === "ATTRIBUTION") {
            agg.attributionTotal++;
            if (o.status === "ATTRIBUTED") agg.attributionSuccess++;
          }
        }
      }

      return Array.from(map.entries()).map(([subTechniqueId, a]) => ({
        subTechniqueId,
        subTechniqueName: a.subName,
        techniqueId: a.techId,
        techniqueName: a.techName,
        tacticId: a.tacticId,
        tacticName: a.tacticName,
        executionCount: a.count,
        detectionRate:
          a.detectionTotal > 0
            ? Math.round((a.detectionSuccess / a.detectionTotal) * 100)
            : 0,
        detectionAvailable: a.detectionTotal > 0,
        preventionRate:
          a.preventionTotal > 0
            ? Math.round((a.preventionSuccess / a.preventionTotal) * 100)
            : 0,
        preventionAvailable: a.preventionTotal > 0,
        attributionRate:
          a.attributionTotal > 0
            ? Math.round((a.attributionSuccess / a.attributionTotal) * 100)
            : 0,
        attributionAvailable: a.attributionTotal > 0,
      }));
    }),

  // Threat Actor TTP Coverage
  byThreatActor: viewerProcedure
    .input(z.object({ threatActorId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const accessFilter = getAccessibleOperationFilter(ctx);

      const threatActors = await ctx.db.threatActor.findMany({
        where: input?.threatActorId ? { id: input.threatActorId } : undefined,
        include: { mitreTechniques: { include: { tactic: true } } },
      });

      const operations = await ctx.db.operation.findMany({
        where: accessFilter,
        include: { techniques: { include: { mitreTechnique: true } } },
      });

      return threatActors.map((actor) => {
        const actorTechniqueIds = new Set(
          actor.mitreTechniques.map((t) => t.id),
        );
        const testedTechniqueIds = new Set<string>();
        let totalOperations = 0;

        operations.forEach((operation) => {
          let hasActorTechnique = false;
          operation.techniques.forEach((technique) => {
            if (
              technique.mitreTechniqueId &&
              actorTechniqueIds.has(technique.mitreTechniqueId)
            ) {
              testedTechniqueIds.add(technique.mitreTechniqueId);
              hasActorTechnique = true;
            }
          });
          if (hasActorTechnique) totalOperations++;
        });

        const coverage =
          actorTechniqueIds.size > 0
            ? Math.round(
                (testedTechniqueIds.size / actorTechniqueIds.size) * 100,
              )
            : 0;

        return {
          id: actor.id,
          name: actor.name,
          description: actor.description,
          topThreat: actor.topThreat,
          totalTechniques: actorTechniqueIds.size,
          testedTechniques: testedTechniqueIds.size,
          coveragePercentage: coverage,
          operationCount: totalOperations,
        };
      });
    }),

  // Defensive Effectiveness Coverage
  byDefensive: viewerProcedure
    .input(
      z
        .object({
          operationId: z.number().optional(),
          period: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const accessFilter = getAccessibleOperationFilter(ctx);

      const filters: Prisma.OperationWhereInput = { ...accessFilter };
      if (input?.operationId) filters.id = input.operationId;

      const outcomes = await ctx.db.outcome.findMany({
        include: {
          technique: {
            include: { operation: { select: { id: true, status: true } } },
          },
        },
        where: { technique: { operation: filters } },
      });

      const totalOutcomes = outcomes.length;
      const detectedCount = outcomes.filter(
        (o) => o.type === OutcomeType.DETECTION,
      ).length;
      const preventedCount = outcomes.filter(
        (o) => o.type === OutcomeType.PREVENTION,
      ).length;
      const attributedCount = outcomes.filter(
        (o) => o.type === OutcomeType.ATTRIBUTION,
      ).length;
      const notDetectedCount = outcomes.filter(
        (o) => o.type !== OutcomeType.DETECTION,
      ).length;
      const notPreventedCount = outcomes.filter(
        (o) => o.type !== OutcomeType.PREVENTION,
      ).length;
      const notAttributedCount = outcomes.filter(
        (o) => o.type !== OutcomeType.ATTRIBUTION,
      ).length;

      return {
        total: totalOutcomes,
        detection:
          totalOutcomes > 0
            ? Math.round((detectedCount / totalOutcomes) * 100)
            : 0,
        prevention:
          totalOutcomes > 0
            ? Math.round((preventedCount / totalOutcomes) * 100)
            : 0,
        attribution:
          totalOutcomes > 0
            ? Math.round((attributedCount / totalOutcomes) * 100)
            : 0,
        breakdown: {
          detected: detectedCount,
          prevented: preventedCount,
          attributed: attributedCount,
          notDetected: notDetectedCount,
          notPrevented: notPreventedCount,
          notAttributed: notAttributedCount,
        },
      };
    }),

  // Comprehensive technique metrics
  techniqueMetrics: viewerProcedure
    .meta({
      description:
        "Get comprehensive execution metrics for all MITRE ATT&CK techniques",
    })
    .query(async ({ ctx }) => {
      const accessFilter = getAccessibleOperationFilter(ctx);

      const executedTechniques = await ctx.db.technique.findMany({
        include: {
          mitreTechnique: { include: { tactic: true } },
          operation: { select: { id: true, name: true, status: true } },
          outcomes: true,
        },
        where: { operation: accessFilter },
      });

      const allMitreTechniques = await ctx.db.mitreTechnique.findMany({
        include: { tactic: true },
      });

      const techniqueMetrics = new Map<
        string,
        {
          techniqueId: string;
          techniqueName: string;
          tacticId: string;
          tacticName: string;
          executed: boolean;
          executionCount: number;
          detectionRate: number;
          detectionAvailable: boolean;
          preventionRate: number;
          preventionAvailable: boolean;
          attributionRate: number;
          attributionAvailable: boolean;
          avgEffectiveness: number;
        }
      >();

      allMitreTechniques.forEach((mitreTech) => {
        techniqueMetrics.set(mitreTech.id, {
          techniqueId: mitreTech.id,
          techniqueName: mitreTech.name,
          tacticId: mitreTech.tactic.id,
          tacticName: mitreTech.tactic.name,
          executed: false,
          executionCount: 0,
          detectionRate: 0,
          detectionAvailable: false,
          preventionRate: 0,
          preventionAvailable: false,
          attributionRate: 0,
          attributionAvailable: false,
          avgEffectiveness: 0,
        });
      });

      const techniqueExecutions = new Map<
        string,
        {
          count: number;
          detectionSuccess: number;
          detectionTotal: number;
          preventionSuccess: number;
          preventionTotal: number;
          attributionSuccess: number;
          attributionTotal: number;
        }
      >();
      const executedAny = new Map<string, boolean>();
      const allCounts = new Map<string, number>();

      executedTechniques.forEach((technique) => {
        if (!technique.mitreTechnique) return;
        const techniqueId = technique.mitreTechnique.id;
        // Count every occurrence for total count
        allCounts.set(techniqueId, (allCounts.get(techniqueId) ?? 0) + 1);
        // Only executed (started) contribute to rates and executed flag
        const isExecuted =
          (technique.startTime !== null && technique.startTime !== undefined) ||
          technique.outcomes.length > 0;
        if (!isExecuted) return;
        executedAny.set(techniqueId, true);
        if (!techniqueExecutions.has(techniqueId)) {
          techniqueExecutions.set(techniqueId, {
            count: 0,
            detectionSuccess: 0,
            detectionTotal: 0,
            preventionSuccess: 0,
            preventionTotal: 0,
            attributionSuccess: 0,
            attributionTotal: 0,
          });
        }
        const execution = techniqueExecutions.get(techniqueId)!;
        execution.count++;
        technique.outcomes.forEach((outcome) => {
          if (outcome.status !== "NOT_APPLICABLE") {
            if (outcome.type === "DETECTION") {
              execution.detectionTotal++;
              if (outcome.status === "DETECTED") execution.detectionSuccess++;
            } else if (outcome.type === "PREVENTION") {
              execution.preventionTotal++;
              if (outcome.status === "PREVENTED") execution.preventionSuccess++;
            } else if (outcome.type === "ATTRIBUTION") {
              execution.attributionTotal++;
              if (outcome.status === "ATTRIBUTED")
                execution.attributionSuccess++;
            }
          }
        });
      });

      techniqueExecutions.forEach((execution, techniqueId) => {
        const metrics = techniqueMetrics.get(techniqueId);
        if (metrics) {
          metrics.executionCount =
            allCounts.get(techniqueId) ?? execution.count;
          metrics.executed = executedAny.get(techniqueId) === true;
          metrics.detectionAvailable = execution.detectionTotal > 0;
          metrics.preventionAvailable = execution.preventionTotal > 0;
          metrics.attributionAvailable = execution.attributionTotal > 0;
          metrics.detectionRate = metrics.detectionAvailable
            ? Math.round(
                (execution.detectionSuccess / execution.detectionTotal) * 100,
              )
            : 0;
          metrics.preventionRate = metrics.preventionAvailable
            ? Math.round(
                (execution.preventionSuccess / execution.preventionTotal) * 100,
              )
            : 0;
          metrics.attributionRate = metrics.attributionAvailable
            ? Math.round(
                (execution.attributionSuccess / execution.attributionTotal) *
                  100,
              )
            : 0;
          const rates = [
            metrics.detectionRate,
            metrics.preventionRate,
            metrics.attributionRate,
          ];
          const valid = rates.filter((r) => r > 0);
          metrics.avgEffectiveness =
            valid.length > 0
              ? Math.round(valid.reduce((s, r) => s + r, 0) / valid.length)
              : 0;
        }
      });

      // Populate non-executed techniques' executionCount from allCounts and ensure executed flag false
      allMitreTechniques.forEach((mitreTech) => {
        const m = techniqueMetrics.get(mitreTech.id)!;
        if (!m.executed) {
          m.executionCount = allCounts.get(mitreTech.id) ?? 0;
        }
      });

      return Array.from(techniqueMetrics.values());
    }),
});
