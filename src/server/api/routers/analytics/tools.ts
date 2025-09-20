import { z } from "zod";
import { createTRPCRouter, viewerProcedure } from "@/server/api/trpc";
import { getAccessibleOperationFilter } from "@/server/api/access";

export const toolsRouter = createTRPCRouter({
  // Defensive Tool Effectiveness
  effectiveness: viewerProcedure
    .input(
      z.object({
        start: z.date(),
        end: z.date(),
        tagIds: z.array(z.string()).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const accessFilter = getAccessibleOperationFilter(ctx);
      const operationFilter = {
        ...accessFilter,
        ...(input.tagIds?.length
          ? { tags: { some: { id: { in: input.tagIds } } } }
          : {}),
        OR: [
          { startDate: { gte: input.start, lte: input.end } },
          { startDate: null, createdAt: { gte: input.start, lte: input.end } },
        ],
      };

    // Get all defensive tools
    const defensiveTools = await ctx.db.tool.findMany({
      where: { type: "DEFENSIVE" },
      select: { id: true, name: true, category: true },
    });

    // Get all log sources
    const logSources = await ctx.db.logSource.findMany({
      select: { id: true, name: true, description: true },
    });

    // Get all outcomes with their tools and log sources (server-side aggregation)
    const outcomes = await ctx.db.outcome.findMany({
      where: {
        technique: { operation: operationFilter },
        OR: [
          { tools: { some: { type: "DEFENSIVE" } } },
          { logSources: { some: {} } },
        ],
      },
      select: {
        type: true,
        status: true,
        tools: {
          where: { type: "DEFENSIVE" },
          select: { id: true },
        },
        logSources: {
          select: { id: true },
        },
      },
    });

    // Calculate effectiveness for each defensive tool
    const toolEffectiveness = defensiveTools.map((tool) => {
      // Find outcomes where this tool was used
      const toolOutcomes = outcomes.filter((outcome) =>
        outcome.tools.some((t) => t.id === tool.id),
      );

      let detectionSuccess = 0;
      let detectionTotal = 0;
      let preventionSuccess = 0;
      let preventionTotal = 0;
      let attributionSuccess = 0;
      let attributionTotal = 0;

      toolOutcomes.forEach((outcome) => {
        // Skip N/A outcomes
        if (outcome.status === "NOT_APPLICABLE") return;

        if (outcome.type === "DETECTION") {
          detectionTotal++;
          if (outcome.status === "DETECTED") detectionSuccess++;
        } else if (outcome.type === "PREVENTION") {
          preventionTotal++;
          if (outcome.status === "PREVENTED") preventionSuccess++;
        } else if (outcome.type === "ATTRIBUTION") {
          attributionTotal++;
          if (outcome.status === "ATTRIBUTED") attributionSuccess++;
        }
      });

      const detectionRate =
        detectionTotal > 0 ? Math.round((detectionSuccess / detectionTotal) * 100) : 0;
      const preventionRate =
        preventionTotal > 0 ? Math.round((preventionSuccess / preventionTotal) * 100) : 0;
      const attributionRate =
        attributionTotal > 0 ? Math.round((attributionSuccess / attributionTotal) * 100) : 0;
      const totalUsage = detectionTotal + preventionTotal + attributionTotal;

      return {
        ...tool,
        totalUsage,
        detectionRate,
        preventionRate,
        attributionRate,
        detectionTotal,
        preventionTotal,
        attributionTotal,
      };
    });

    // Calculate effectiveness for each log source
    const logSourceEffectiveness = logSources.map((logSource) => {
      // Find outcomes where this log source was used
      const logOutcomes = outcomes.filter((outcome) =>
        outcome.logSources.some((ls) => ls.id === logSource.id),
      );

      let detectionSuccess = 0;
      let detectionTotal = 0;
      let attributionSuccess = 0;
      let attributionTotal = 0;

      logOutcomes.forEach((outcome) => {
        // Skip N/A outcomes
        if (outcome.status === "NOT_APPLICABLE") return;

        if (outcome.type === "DETECTION") {
          detectionTotal++;
          if (outcome.status === "DETECTED") detectionSuccess++;
        } else if (outcome.type === "ATTRIBUTION") {
          attributionTotal++;
          if (outcome.status === "ATTRIBUTED") attributionSuccess++;
        }
        // Note: Log sources don't typically handle PREVENTION outcomes
      });

      const detectionRate =
        detectionTotal > 0 ? Math.round((detectionSuccess / detectionTotal) * 100) : 0;
      const attributionRate =
        attributionTotal > 0 ? Math.round((attributionSuccess / attributionTotal) * 100) : 0;
      const totalUsage = detectionTotal + attributionTotal;

      return {
        ...logSource,
        totalUsage,
        detectionRate,
        attributionRate,
        detectionTotal,
        attributionTotal,
      };
    });

    return {
      tools: toolEffectiveness.sort((a, b) => b.totalUsage - a.totalUsage),
      logSources: logSourceEffectiveness.sort((a, b) => b.totalUsage - a.totalUsage),
    };
  }),
});

