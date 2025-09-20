import { createTRPCRouter } from "@/server/api/trpc";
import { toolsRouter } from "./analytics/tools";
import { summaryRouter } from "./analytics/summary";
import { coverageRouter } from "./analytics/coverage";
import { trendsRouter } from "./analytics/trends";
import { scorecardRouter } from "./analytics/scorecard";

// Types for proper context
// Note: analytics procedures receive `ctx` from tRPC; explicit Context type not required here.

// Access filter centralized in @/server/api/access

// Use shared viewerProcedure from trpc (semantic alias for protected)

export const analyticsRouter = createTRPCRouter({
  // Coverage Analytics
  coverage: coverageRouter,
  // Time-Series Analytics
  trends: trendsRouter,
  // Summary Statistics
  summary: summaryRouter,
  // Period Scorecard metrics
  scorecard: scorecardRouter,
  // Tool Analytics
  tools: toolsRouter,
});
