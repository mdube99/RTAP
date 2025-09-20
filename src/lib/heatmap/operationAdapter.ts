import type { RouterOutputs } from "@/trpc/react";
import type { TechniqueRow } from "@features/shared/heatmap/attack-matrix";

type Operation = RouterOutputs["operations"]["getById"];
type Technique = Operation["techniques"][number] & { executedSuccessfully: boolean | null };

export function buildOperationHeatmapData(operation: Operation): TechniqueRow[] {
  const byTechnique = new Map<string, TechniqueRow>();

  for (const t of operation.techniques as Technique[]) {
    const tech = t.mitreTechnique;
    const tact = t.mitreTechnique?.tactic;
    if (!tech || !tact) continue;

    const successKey = t.executedSuccessfully === true ? "success" : t.executedSuccessfully === false ? "fail" : "unknown";
    const key = `${tech.id}-${successKey}`;

    if (!byTechnique.has(key)) {
      byTechnique.set(key, {
        techniqueId: tech.id,
        techniqueName: tech.name,
        tacticId: tact.id,
        tacticName: tact.name,
        executed: false,
        executedStatus: "not",
        executionSuccess: t.executedSuccessfully ?? undefined,
        executionCount: 0,
        subTechs: [],
        sortOrder: t.sortOrder ?? 0,
      });
    }

    const row = byTechnique.get(key)!;
    row.executionCount = (row.executionCount ?? 0) + 1;

    const executed = !!t.startTime;
    const completed = !!t.endTime;
    if (executed) row.executed = true;
    if (completed) {
      row.executedStatus = "completed";
    } else if (executed && row.executedStatus !== "completed") {
      row.executedStatus = "inProgress";
    }

    const outcomes = t.outcomes;

    if (t.mitreSubTechnique) {
      // Attach outcomes to sub-technique, not the parent row
      row.subTechs!.push({
        id: t.mitreSubTechnique.id,
        name: t.mitreSubTechnique.name,
        executed,
        executedStatus: completed ? "completed" : executed ? "inProgress" : "not",
        executionSuccess: t.executedSuccessfully ?? undefined,
        detectionSuccess: (() => {
          const gradable = outcomes.filter(o => o.type === "DETECTION" && o.status !== "NOT_APPLICABLE");
          if (gradable.length === 0) return undefined;
          return gradable.some(o => o.status === "DETECTED");
        })(),
        preventionSuccess: (() => {
          const gradable = outcomes.filter(o => o.type === "PREVENTION" && o.status !== "NOT_APPLICABLE");
          if (gradable.length === 0) return undefined;
          return gradable.some(o => o.status === "PREVENTED");
        })(),
        attributionSuccess: (() => {
          const gradable = outcomes.filter(o => o.type === "ATTRIBUTION" && o.status !== "NOT_APPLICABLE");
          if (gradable.length === 0) return undefined;
          return gradable.some(o => o.status === "ATTRIBUTED");
        })(),
      });
    } else {
      // Parent technique explicitly called out; attach outcomes at parent row level
      const apply = <K extends "detectionSuccess" | "preventionSuccess" | "attributionSuccess">(
        type: "DETECTION" | "PREVENTION" | "ATTRIBUTION",
        prop: K,
      ) => {
        const gradable = outcomes.filter(o => o.type === type && o.status !== "NOT_APPLICABLE");
        if (gradable.length === 0) return; // leave as N/A
        const success = gradable.some(o =>
          type === "DETECTION"
            ? o.status === "DETECTED"
            : type === "PREVENTION"
            ? o.status === "PREVENTED"
            : o.status === "ATTRIBUTED",
        );
        const current = row[prop];
        if (current === true) return;
        row[prop] = success as TechniqueRow[K];
      };
      apply("DETECTION", "detectionSuccess");
      apply("PREVENTION", "preventionSuccess");
      apply("ATTRIBUTION", "attributionSuccess");
    }
  }

  return Array.from(byTechnique.values());
}

export function buildOperationOverlayForAnalytics(
  operation: Operation,
): Map<string, { count: number; detectionRate: number; preventionRate: number; attributionRate: number }> {
  const byTechnique: Record<string, { executed: number; detected: number; prevented: number; attributed: number }> = {};
  for (const t of operation.techniques) {
    const tech = t.mitreTechnique;
    if (!tech) continue;
    const key = tech.id;
    byTechnique[key] ??= { executed: 0, detected: 0, prevented: 0, attributed: 0 };
    const executed = !!t.startTime;
    if (executed) {
      byTechnique[key].executed += 1;
      if (t.outcomes.some(o => o.type === 'DETECTION' && o.status === 'DETECTED')) byTechnique[key].detected += 1;
      if (t.outcomes.some(o => o.type === 'PREVENTION' && o.status === 'PREVENTED')) byTechnique[key].prevented += 1;
      if (t.outcomes.some(o => o.type === 'ATTRIBUTION' && o.status === 'ATTRIBUTED')) byTechnique[key].attributed += 1;
    }
  }
  const overlay = new Map<string, { count: number; detectionRate: number; preventionRate: number; attributionRate: number }>();
  for (const [techniqueId, agg] of Object.entries(byTechnique)) {
    const count = agg.executed;
    const pct = (n: number) => (count > 0 ? Math.round((n / count) * 100) : 0);
    overlay.set(techniqueId, {
      count,
      detectionRate: pct(agg.detected),
      preventionRate: pct(agg.prevented),
      attributionRate: pct(agg.attributed),
    });
  }
  return overlay;
}
