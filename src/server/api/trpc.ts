/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import { randomUUID } from "crypto";
import superjson from "superjson";
import { ZodError } from "zod";
import { UserRole } from "@prisma/client";

import { auth } from "@/server/auth";
import { logger } from "@/server/logger";
import { db } from "@/server/db";

/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const session = await auth();
  const requestId = opts.headers.get("x-request-id") ?? randomUUID();

  // Initialization is handled by scripts/init.ts before the server starts.

  return {
    db,
    session,
    requestId,
    ...opts,
  };
};

// Canonical context types
export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
export type AuthedContext = Omit<TRPCContext, "session"> & {
  session: NonNullable<TRPCContext["session"]>;
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (process.env.NODE_ENV === 'development') {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  if (process.env.NODE_ENV === 'development') {
    logger.debug(`[TRPC] ${path} took ${end - start}ms to execute`);
  }

  return result;
});

// Note: We intentionally do not expose a public (unauthenticated) procedure in this app.
// All routes require authentication; use protectedProcedure/viewerProcedure/operatorProcedure/adminProcedure.

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(({ ctx, next }) => {
    const { session, ...rest } = ctx;
    if (!session?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    const authedCtx: AuthedContext = {
      ...rest,
      session: { ...session, user: session.user },
    };
    return next({ ctx: authedCtx });
  });

/**
 * Admin procedure
 *
 * Only accessible to users with the ADMIN role.
 */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== UserRole.ADMIN) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }
  return next();
});

/**
 * Operator procedure
 *
 * Accessible to users with ADMIN or OPERATOR roles.
 */
export const operatorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== UserRole.ADMIN && ctx.session.user.role !== UserRole.OPERATOR) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Operator or Admin access required",
    });
  }
  return next();
});

/**
 * Viewer procedure
 *
 * Accessible to all authenticated users (ADMIN, OPERATOR, or VIEWER roles).
 * This is effectively the same as protectedProcedure but provides semantic clarity.
 */
export const viewerProcedure = protectedProcedure;
