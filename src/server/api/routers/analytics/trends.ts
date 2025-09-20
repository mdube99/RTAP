import { z } from "zod";
import { OutcomeType } from "@prisma/client";
import { createTRPCRouter, viewerProcedure } from "@/server/api/trpc";
import { getAccessibleOperationFilter } from "@/server/api/access";

export const trendsRouter = createTRPCRouter({
  // Operations over time
  operations: viewerProcedure
    .input(
      z.object({
        period: z.enum(["7d", "30d", "90d", "1y", "all"]).describe("Time range to analyze"),
        groupBy: z.enum(["day", "week", "month"]).optional(),
        tagIds: z.array(z.string()).optional().describe("Filter to operations that have any of these tag IDs"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const accessFilter = getAccessibleOperationFilter(ctx);

      const periodDaysMap = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 } as const;
      const periodDays = periodDaysMap[input.period as keyof typeof periodDaysMap];
      const startDate =
        input.period === "all"
          ? new Date(0)
          : (() => {
              const d = new Date();
              d.setDate(d.getDate() - periodDays);
              return d;
            })();

      const operations = await ctx.db.operation.findMany({
        where: {
          ...accessFilter,
          status: "COMPLETED",
          ...(input.tagIds?.length ? { tags: { some: { id: { in: input.tagIds } } } } : {}),
          endDate: { gte: startDate },
        },
        select: { id: true, status: true, endDate: true },
        orderBy: { endDate: "asc" },
      });

      const techniques = await ctx.db.technique.findMany({
        where: {
          operation: {
            ...accessFilter,
            status: "COMPLETED",
            ...(input.tagIds?.length ? { tags: { some: { id: { in: input.tagIds } } } } : {}),
          },
          endTime: { not: null, gte: startDate },
        },
        select: { endTime: true },
        orderBy: { endTime: "asc" },
      });

      const grouping =
        input.groupBy ?? (input.period === "7d" ? "day" : input.period === "30d" ? "week" : "month");
      const grouped = new Map<string, { date: string; total: number; active: number; completed: number; planning: number; cancelled: number; techniqueCount: number }>();

      const makeKey = (date: Date) => {
        if (grouping === "day") return date.toISOString().split("T")[0] ?? "";
        if (grouping === "week") {
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          return weekStart.toISOString().split("T")[0] ?? "";
        }
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      };

      operations.forEach((op) => {
        const key = makeKey(new Date(op.endDate!));
        if (!grouped.has(key)) grouped.set(key, { date: key, total: 0, active: 0, completed: 0, planning: 0, cancelled: 0, techniqueCount: 0 });
        const g = grouped.get(key)!;
        g.total++;
        const status = op.status.toLowerCase();
        if (status === "active") g.active++;
        else if (status === "completed") g.completed++;
        else if (status === "planning") g.planning++;
        else if (status === "cancelled") g.cancelled++;
      });

      techniques.forEach((tech) => {
        const key = makeKey(new Date(tech.endTime!));
        if (!grouped.has(key)) grouped.set(key, { date: key, total: 0, active: 0, completed: 0, planning: 0, cancelled: 0, techniqueCount: 0 });
        grouped.get(key)!.techniqueCount++;
      });

      return Array.from(grouped.values()).sort((a, b) => a.date.localeCompare(b.date));
    }),

  // Effectiveness trends over time
  effectiveness: viewerProcedure
    .input(
      z.object({
        period: z.enum(["7d", "30d", "90d", "1y", "all"]),
        groupBy: z.enum(["day", "week", "month"]).optional(),
        tagIds: z.array(z.string()).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const accessFilter = getAccessibleOperationFilter(ctx);
      const periodDaysMap = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 } as const;
      const periodDays = periodDaysMap[input.period as keyof typeof periodDaysMap];
      const startDate =
        input.period === "all"
          ? new Date(0)
          : (() => {
              const d = new Date();
              d.setDate(d.getDate() - periodDays);
              return d;
            })();

      const outcomes = await ctx.db.outcome.findMany({
        where: {
          technique: {
            endTime: { not: null, gte: startDate },
            operation: {
              ...accessFilter,
              status: "COMPLETED",
              ...(input.tagIds?.length ? { tags: { some: { id: { in: input.tagIds } } } } : {}),
            },
          },
        },
        include: {
          technique: { select: { startTime: true, endTime: true } },
        },
      });

      const grouping =
        input.groupBy ?? (input.period === "7d" ? "day" : input.period === "30d" ? "week" : "month");
      const grouped = new Map<string, {
        date: string;
        detectionAttempts: number; detectionSuccesses: number;
        preventionAttempts: number; preventionSuccesses: number;
        attributionAttempts: number; attributionSuccesses: number;
        totalDetectionTime: number; detectionTimeCount: number;
        totalAttributionTime: number; attributionTimeCount: number;
      }>();

      const makeKey = (d: Date) => {
        if (grouping === "day") return d.toISOString().split("T")[0] ?? "";
        if (grouping === "week") { const s = new Date(d); s.setDate(d.getDate() - d.getDay()); return s.toISOString().split("T")[0] ?? ""; }
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      };

      outcomes.forEach((outcome) => {
        if (outcome.status === "NOT_APPLICABLE") return;
        const end = new Date(outcome.technique.endTime!);
        const key = makeKey(end);
        if (!grouped.has(key)) grouped.set(key, {
          date: key,
          detectionAttempts: 0, detectionSuccesses: 0,
          preventionAttempts: 0, preventionSuccesses: 0,
          attributionAttempts: 0, attributionSuccesses: 0,
          totalDetectionTime: 0, detectionTimeCount: 0,
          totalAttributionTime: 0, attributionTimeCount: 0,
        });
        const g = grouped.get(key)!;
        if (outcome.type === OutcomeType.DETECTION) {
          g.detectionAttempts++;
          if (outcome.status === "DETECTED") {
            g.detectionSuccesses++;
            if (outcome.detectionTime && outcome.technique.startTime) {
              const start = new Date(outcome.technique.startTime);
              const det = new Date(outcome.detectionTime);
              const m = Math.round((det.getTime() - start.getTime()) / (1000 * 60));
              if (m >= 0) { g.totalDetectionTime += m; g.detectionTimeCount++; }
            }
          }
        } else if (outcome.type === OutcomeType.PREVENTION) {
          g.preventionAttempts++;
          if (outcome.status === "PREVENTED") g.preventionSuccesses++;
        } else if (outcome.type === OutcomeType.ATTRIBUTION) {
          g.attributionAttempts++;
          if (outcome.status === "ATTRIBUTED") {
            g.attributionSuccesses++;
            if (outcome.detectionTime && outcome.technique.startTime) {
              const start = new Date(outcome.technique.startTime);
              const det = new Date(outcome.detectionTime);
              const m = Math.round((det.getTime() - start.getTime()) / (1000 * 60));
              if (m >= 0) { g.totalAttributionTime += m; g.attributionTimeCount++; }
            }
          }
        }
      });
      return Array.from(grouped.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((g) => ({
          date: g.date,
          detectionRate: g.detectionAttempts > 0 ? Math.round((g.detectionSuccesses / g.detectionAttempts) * 100) : 0,
          preventionRate: g.preventionAttempts > 0 ? Math.round((g.preventionSuccesses / g.preventionAttempts) * 100) : 0,
          attributionRate: g.attributionAttempts > 0 ? Math.round((g.attributionSuccesses / g.attributionAttempts) * 100) : 0,
          avgTimeToDetect: g.detectionTimeCount > 0 ? Math.round(g.totalDetectionTime / g.detectionTimeCount) : undefined,
          avgTimeToAttribute: g.attributionTimeCount > 0 ? Math.round(g.totalAttributionTime / g.attributionTimeCount) : undefined,
        }));
    }),

  operationTimeline: viewerProcedure
    .input(
      z.object({
        period: z.enum(["30d", "90d", "1y", "all"]),
        tagIds: z.array(z.string()).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const accessFilter = getAccessibleOperationFilter(ctx);
      const periodDaysMap = { "30d": 30, "90d": 90, "1y": 365 } as const;
      const now = new Date();

      let startBoundary: Date | null = null;
      if (input.period !== "all") {
        const days = periodDaysMap[input.period];
        const start = new Date(now);
        start.setDate(start.getDate() - days);
        startBoundary = start;
      }
      const endBoundary = now;

      const operations = await ctx.db.operation.findMany({
        where: {
          ...accessFilter,
          startDate: {
            not: null,
            lte: endBoundary,
          },
          ...(startBoundary
            ? {
                OR: [{ endDate: null }, { endDate: { gte: startBoundary } }],
              }
            : {}),
          ...(input.tagIds?.length ? { tags: { some: { id: { in: input.tagIds } } } } : {}),
        },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
        },
        orderBy: { startDate: "asc" },
      });

      return operations
        .filter((operation): operation is typeof operation & { startDate: Date } => Boolean(operation.startDate))
        .map((operation) => ({
          id: operation.id,
          name: operation.name,
          startDate: operation.startDate.toISOString(),
          endDate: operation.endDate ? operation.endDate.toISOString() : null,
        }));
    }),

  // Technique usage patterns (top-N)
  techniques: viewerProcedure
    .input(
      z.object({ period: z.enum(["7d", "30d", "90d", "1y", "all"]), topN: z.number().min(5).max(20).default(10) })
    )
    .query(async ({ ctx, input }) => {
      const accessFilter = getAccessibleOperationFilter(ctx);
      const periodDaysMap = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 } as const;
      const periodDays = periodDaysMap[input.period as keyof typeof periodDaysMap];
      const startDate =
        input.period === "all"
          ? new Date(0)
          : (() => {
              const d = new Date();
              d.setDate(d.getDate() - periodDays);
              return d;
            })();

      const techniques = await ctx.db.technique.findMany({
        where: { operation: { ...accessFilter, createdAt: { gte: startDate } } },
        include: { mitreTechnique: { include: { tactic: true } }, outcomes: true },
      });

      const techniqueMap = new Map<string, { id: string; name: string; tactic: string; usage: number; outcomes: { type: OutcomeType }[] }>();
      techniques.forEach((technique) => {
        if (!technique.mitreTechniqueId) return;
        const key = technique.mitreTechniqueId;
        if (!techniqueMap.has(key)) {
          techniqueMap.set(key, {
            id: technique.mitreTechniqueId,
            name: technique.mitreTechnique?.name ?? "Unknown",
            tactic: technique.mitreTechnique?.tactic?.name ?? "Unknown",
            usage: 0,
            outcomes: [],
          });
        }
        const data = techniqueMap.get(key)!;
        data.usage++;
        data.outcomes.push(...technique.outcomes);
      });

      const sorted = Array.from(techniqueMap.values())
        .map((technique) => {
          const detected = technique.outcomes.filter((o) => o.type === OutcomeType.DETECTION).length;
          const total = technique.outcomes.length;
          return { id: technique.id, name: technique.name, tactic: technique.tactic, usage: technique.usage, detectionRate: total > 0 ? Math.round((detected / total) * 100) : 0 };
        })
        .sort((a, b) => b.usage - a.usage)
        .slice(0, input.topN);

      return sorted;
    }),

});
