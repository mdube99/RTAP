import { z } from "zod";
import { OutcomeType } from "@prisma/client";
import { createTRPCRouter, viewerProcedure } from "@/server/api/trpc";
import { getAccessibleOperationFilter } from "@/server/api/access";

export const trendsRouter = createTRPCRouter({
  // Operations over time
  operations: viewerProcedure
    .input(
      z.object({
        period: z
          .enum(["7d", "30d", "90d", "1y", "all"])
          .describe("Time range to analyze"),
        groupBy: z.enum(["day", "week", "month"]).optional(),
        tagIds: z
          .array(z.string())
          .optional()
          .describe("Filter to operations that have any of these tag IDs"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const accessFilter = getAccessibleOperationFilter(ctx);

      const periodDaysMap = {
        "7d": 7,
        "30d": 30,
        "90d": 90,
        "1y": 365,
      } as const;
      const periodDays =
        periodDaysMap[input.period as keyof typeof periodDaysMap];
      const startDate =
        input.period === "all"
          ? new Date(0)
          : (() => {
              const d = new Date();
              d.setUTCDate(d.getUTCDate() - periodDays);
              d.setUTCHours(0, 0, 0, 0);
              return d;
            })();

      const operations = await ctx.db.operation.findMany({
        where: {
          ...accessFilter,
          status: "COMPLETED",
          ...(input.tagIds?.length
            ? { tags: { some: { id: { in: input.tagIds } } } }
            : {}),
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
            ...(input.tagIds?.length
              ? { tags: { some: { id: { in: input.tagIds } } } }
              : {}),
          },
          endTime: { not: null, gte: startDate },
        },
        select: { endTime: true },
        orderBy: { endTime: "asc" },
      });

      const grouping =
        input.groupBy ??
        (input.period === "7d"
          ? "day"
          : input.period === "30d"
            ? "week"
            : "month");
      const grouped = new Map<
        string,
        {
          date: string;
          total: number;
          active: number;
          completed: number;
          planning: number;
          cancelled: number;
          techniqueCount: number;
        }
      >();

      const makeKey = (date: Date) => {
        if (grouping === "day") return date.toISOString().split("T")[0] ?? "";
        if (grouping === "week") {
          const weekStart = new Date(date);
          weekStart.setUTCDate(date.getUTCDate() - date.getUTCDay());
          return weekStart.toISOString().split("T")[0] ?? "";
        }
        return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
      };

      operations.forEach((op) => {
        const key = makeKey(new Date(op.endDate!));
        if (!grouped.has(key))
          grouped.set(key, {
            date: key,
            total: 0,
            active: 0,
            completed: 0,
            planning: 0,
            cancelled: 0,
            techniqueCount: 0,
          });
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
        if (!grouped.has(key))
          grouped.set(key, {
            date: key,
            total: 0,
            active: 0,
            completed: 0,
            planning: 0,
            cancelled: 0,
            techniqueCount: 0,
          });
        grouped.get(key)!.techniqueCount++;
      });

      return Array.from(grouped.values()).sort((a, b) =>
        a.date.localeCompare(b.date),
      );
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
      const periodDaysMap = {
        "7d": 7,
        "30d": 30,
        "90d": 90,
        "1y": 365,
      } as const;
      const periodDays =
        periodDaysMap[input.period as keyof typeof periodDaysMap];
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
              ...(input.tagIds?.length
                ? { tags: { some: { id: { in: input.tagIds } } } }
                : {}),
            },
          },
        },
        include: {
          technique: { select: { startTime: true, endTime: true } },
        },
      });

      const grouping =
        input.groupBy ??
        (input.period === "7d"
          ? "day"
          : input.period === "30d"
            ? "week"
            : "month");
      const grouped = new Map<
        string,
        {
          date: string;
          detectionAttempts: number;
          detectionSuccesses: number;
          preventionAttempts: number;
          preventionSuccesses: number;
          attributionAttempts: number;
          attributionSuccesses: number;
          totalDetectionTime: number;
          detectionTimeCount: number;
          totalAttributionTime: number;
          attributionTimeCount: number;
        }
      >();

      const makeKey = (d: Date) => {
        if (grouping === "day") return d.toISOString().split("T")[0] ?? "";
        if (grouping === "week") {
          const s = new Date(d);
          s.setUTCDate(d.getUTCDate() - d.getUTCDay());
          return s.toISOString().split("T")[0] ?? "";
        }
        return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      };

      outcomes.forEach((outcome) => {
        if (outcome.status === "NOT_APPLICABLE") return;
        const end = new Date(outcome.technique.endTime!);
        const key = makeKey(end);
        if (!grouped.has(key))
          grouped.set(key, {
            date: key,
            detectionAttempts: 0,
            detectionSuccesses: 0,
            preventionAttempts: 0,
            preventionSuccesses: 0,
            attributionAttempts: 0,
            attributionSuccesses: 0,
            totalDetectionTime: 0,
            detectionTimeCount: 0,
            totalAttributionTime: 0,
            attributionTimeCount: 0,
          });
        const g = grouped.get(key)!;
        if (outcome.type === OutcomeType.DETECTION) {
          g.detectionAttempts++;
          if (outcome.status === "DETECTED") {
            g.detectionSuccesses++;
            if (outcome.detectionTime && outcome.technique.startTime) {
              const start = new Date(outcome.technique.startTime);
              const det = new Date(outcome.detectionTime);
              const m = Math.round(
                (det.getTime() - start.getTime()) / (1000 * 60),
              );
              if (m >= 0) {
                g.totalDetectionTime += m;
                g.detectionTimeCount++;
              }
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
              const m = Math.round(
                (det.getTime() - start.getTime()) / (1000 * 60),
              );
              if (m >= 0) {
                g.totalAttributionTime += m;
                g.attributionTimeCount++;
              }
            }
          }
        }
      });
      return Array.from(grouped.values())
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((g) => ({
          date: g.date,
          detectionRate:
            g.detectionAttempts > 0
              ? Math.round((g.detectionSuccesses / g.detectionAttempts) * 100)
              : 0,
          preventionRate:
            g.preventionAttempts > 0
              ? Math.round((g.preventionSuccesses / g.preventionAttempts) * 100)
              : 0,
          attributionRate:
            g.attributionAttempts > 0
              ? Math.round(
                  (g.attributionSuccesses / g.attributionAttempts) * 100,
                )
              : 0,
          avgTimeToDetect:
            g.detectionTimeCount > 0
              ? Math.round(g.totalDetectionTime / g.detectionTimeCount)
              : undefined,
          avgTimeToAttribute:
            g.attributionTimeCount > 0
              ? Math.round(g.totalAttributionTime / g.attributionTimeCount)
              : undefined,
        }));
    }),

  operationTimeline: viewerProcedure
    .input(
      z.object({
        period: z.enum(["30d", "90d", "1y", "all"]),
        tagIds: z.array(z.string()).optional(),
        topN: z.number().optional().default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      const accessFilter = getAccessibleOperationFilter(ctx);
      const periodDaysMap = {
        "30d": 30,
        "90d": 90,
        "1y": 365,
      } as const;
      const periodDays =
        periodDaysMap[input.period as keyof typeof periodDaysMap];
      const startDate =
        input.period === "all"
          ? new Date(0)
          : (() => {
              const d = new Date();
              d.setUTCDate(d.getUTCDate() - periodDays);
              d.setUTCHours(0, 0, 0, 0);
              return d;
            })();

      const operations = await ctx.db.operation.findMany({
        where: {
          ...accessFilter,
          ...(input.tagIds?.length
            ? { tags: { some: { id: { in: input.tagIds } } } }
            : {}),
          startDate: { gte: startDate },
        },
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
        },
        orderBy: { startDate: "desc" },
        take: input.topN,
      });

      return operations.map((op) => ({
        id: String(op.id),
        name: op.name,
        startDate: op.startDate?.toISOString() ?? new Date().toISOString(),
        endDate: op.endDate?.toISOString() ?? null,
      }));
    }),
});
