import { createTRPCRouter, adminProcedure, operatorProcedure } from "@/server/api/trpc";
import { z } from "zod";
import { loadLocalEnterpriseBundle, extractActorCandidates, extractOperationCandidates } from "@/server/import/stix";
import { createTechniqueWithValidations } from "@/server/services/techniqueService";
import { createThreatActor } from "@/server/services/threatActorService";
import { createOperationWithValidations } from "@/server/services/operationService";
import { processMitreDescription } from "@/lib/mitreDescriptionUtils";

const listInput = z.object({
  kind: z.enum(["actor", "operation"]),
  source: z.literal("local"),
  query: z.string().optional(),
});

const runInputBase = z.object({
  kind: z.enum(["actor", "operation"]),
  source: z.literal("local"),
  ids: z.array(z.string()).min(1),
  selections: z.record(z.string(), z.array(z.string())).optional(), // per-candidate selected technique IDs
});

export const importRouter = createTRPCRouter({
  listCandidates: createTRPCRouter({
    actors: adminProcedure.input(listInput.extend({ kind: z.literal("actor") })).query(({ input }) => {
      const bundle = loadLocalEnterpriseBundle();
      let items = extractActorCandidates(bundle);
      if (input.query) {
        const q = input.query.toLowerCase();
        items = items.filter((i) => i.name.toLowerCase().includes(q));
      }
      return { items };
    }),
    operations: operatorProcedure.input(listInput.extend({ kind: z.literal("operation") })).query(({ input }) => {
      const bundle = loadLocalEnterpriseBundle();
      let items = extractOperationCandidates(bundle);
      // Preserve bundle ordering for operations list; UI may add search filtering.
      if (input.query) {
        const q = input.query.toLowerCase();
        items = items.filter((i) => i.name.toLowerCase().includes(q));
      }
      return { items };
    }),
  }),

  run: createTRPCRouter({
    actors: adminProcedure.input(runInputBase.extend({ kind: z.literal("actor") })).mutation(async ({ ctx, input }) => {
      const bundle = loadLocalEnterpriseBundle();
      const all = extractActorCandidates(bundle);
      const selected = all.filter((c) => input.ids.includes(c.key));

      let created = 0;
      let skipped = 0;
      const warnings: string[] = [];
      for (const cand of selected) {
        // Skip on exact name match
        const existing = await ctx.db.threatActor.findFirst({ where: { name: cand.name } });
        if (existing) {
          skipped++;
          continue;
        }
        // Use user-selected technique IDs when provided; otherwise all from candidate
        const selectedForCand = input.selections?.[cand.key];
        const rawSelected = Array.isArray(selectedForCand) && selectedForCand.length > 0
          ? cand.techniqueIds.filter((id) => selectedForCand.includes(id))
          : cand.techniqueIds;
        // Normalize to base technique IDs and filter to existing techniques
        const techniqueIdsStrict: string[] = rawSelected.filter((id): id is string => typeof id === "string");
        const baseIds: string[] = [];
        for (const id of techniqueIdsStrict) {
          const [base] = id.split(".");
          if (base && !baseIds.includes(base)) baseIds.push(base);
        }
        const found = await ctx.db.mitreTechnique.findMany({ where: { id: { in: baseIds } }, select: { id: true } });
        const mitreTechniqueIds = found.map((t) => t.id);
        if (mitreTechniqueIds.length !== baseIds.length) {
          const missing = baseIds.filter((id) => !mitreTechniqueIds.includes(id));
          if (missing.length > 0) warnings.push(`Actor ${cand.name}: ${missing.length} technique(s) not found and were skipped`);
        }
        // Prefer a concise, cleaned description suitable for list UIs
        const actorDesc = processMitreDescription(cand.description ?? "").short;
        await createThreatActor(ctx.db, {
          name: cand.name,
          description: actorDesc,
          mitreTechniqueIds,
        });
        created++;
      }
      return { created, skipped, warnings };
    }),

    operations: operatorProcedure.input(runInputBase.extend({ kind: z.literal("operation") })).mutation(async ({ ctx, input }) => {
      const bundle = loadLocalEnterpriseBundle();
      const all = extractOperationCandidates(bundle);
      const selected = all.filter((c) => input.ids.includes(c.key));

      let created = 0;
      let skipped = 0;
      const warnings: string[] = [];

      for (const cand of selected) {
        const existing = await ctx.db.operation.findFirst({ where: { name: cand.name } });
        if (existing) {
          skipped++;
          continue;
        }
        const opDesc = processMitreDescription(cand.description ?? "").short;
        const op = await createOperationWithValidations({
          db: ctx.db,
          user: ctx.session.user,
          input: { name: cand.name, description: opDesc },
        });

        // Create techniques via shared service, handling missing sub-tech by downgrading to parent
        const rawSelections = input.selections?.[cand.key];
        const selectedForCand = Array.isArray(rawSelections)
          ? rawSelections
              .filter((id): id is string => typeof id === "string")
              .map((id) => id.trim().toUpperCase())
          : [];
        const techniquesToImport = selectedForCand.length > 0
          ? cand.techniques.filter((t) => selectedForCand.includes(t.techniqueId.trim().toUpperCase()))
          : cand.techniques;
        // Preserve candidate sequence from STIX bundle; creation order sets sortOrder
        for (const t of techniquesToImport) {
          const techniqueId = t.techniqueId.trim().toUpperCase();
          const isSub = techniqueId.includes(".");
          const [splitBase] = techniqueId.split(".");
          const baseId = isSub ? (splitBase ?? techniqueId) : techniqueId;
          try {
            await createTechniqueWithValidations(ctx.db, {
              operationId: op.id,
              description: processMitreDescription(t.description ?? baseId).short,
              mitreTechniqueId: baseId,
              mitreSubTechniqueId: isSub ? techniqueId : undefined,
            });
          } catch (err) {
            const e = err as { message?: string };
            const msg = typeof e.message === "string" ? e.message : String(err);
            if (msg.includes("MITRE sub-technique not found")) {
              warnings.push(`Operation ${cand.name}: sub-technique ${techniqueId} not found; using parent only`);
              try {
                await createTechniqueWithValidations(ctx.db, {
                  operationId: op.id,
                  description: processMitreDescription(t.description ?? baseId).short,
                  mitreTechniqueId: baseId,
                });
              } catch {
                warnings.push(`Operation ${cand.name}: technique ${baseId} not found; skipped`);
              }
            } else if (msg.includes("MITRE technique not found")) {
              warnings.push(`Operation ${cand.name}: technique ${baseId} not found; skipped`);
            } else {
              warnings.push(`Operation ${cand.name}: failed to add ${techniqueId}`);
            }
          }
        }
        created++;
      }
      return { created, skipped, warnings };
    }),
  }),
});
