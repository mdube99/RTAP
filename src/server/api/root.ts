import { taxonomyRouter } from "@/server/api/routers/taxonomy";
import { usersRouter } from "@/server/api/routers/users";
import { groupsRouter } from "@/server/api/routers/groups";
import { operationsRouter } from "@/server/api/routers/operations";
import { techniquesRouter } from "@/server/api/routers/techniques";
import { outcomesRouter } from "@/server/api/routers/outcomes";
import { databaseRouter } from "@/server/api/routers/database";
import { analyticsRouter } from "@/server/api/routers/analytics";
import { importRouter } from "@/server/api/routers/import";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  taxonomy: taxonomyRouter,
  users: usersRouter,
  groups: groupsRouter,
  operations: operationsRouter,
  techniques: techniquesRouter,
  outcomes: outcomesRouter,
  database: databaseRouter,
  analytics: analyticsRouter,
  import: importRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.operations.list({});
 *       ^? Operation[]
 */
export const createCaller = createCallerFactory(appRouter);
