import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { UserRole } from "@prisma/client";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { createLogSource, updateLogSource, deleteLogSource } from "@/server/services/taxonomyService";
import { auditEvent, logger } from "@/server/logger";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.session.user.role !== UserRole.ADMIN) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next();
});

export const logSourcesRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.logSource.findMany({ orderBy: { name: "asc" } });
  }),
  create: adminProcedure.input(z.object({ name: z.string().min(1), description: z.string() })).mutation(async ({ ctx, input }) => {
    const ls = await createLogSource(ctx.db, input);
    logger.info(
      auditEvent(ctx, "sec.taxonomy.logSource.create", { id: ls.id, name: ls.name }),
      "Log source created",
    );
    return ls;
  }),
  update: adminProcedure.input(z.object({ id: z.string(), name: z.string().min(1).optional(), description: z.string().optional() })).mutation(async ({ ctx, input }) => {
    const updated = await updateLogSource(ctx.db, input);
    logger.info(
      auditEvent(ctx, "sec.taxonomy.logSource.update", { id: input.id, name: updated.name }),
      "Log source updated",
    );
    return updated;
  }),
  delete: adminProcedure.input(z.object({ id: z.string() })).mutation(async ({ ctx, input }) => {
    const res = await deleteLogSource(ctx.db, input.id);
    logger.info(
      auditEvent(ctx, "sec.taxonomy.logSource.delete", { id: input.id, name: res.name }),
      "Log source deleted",
    );
    return res;
  }),
});
