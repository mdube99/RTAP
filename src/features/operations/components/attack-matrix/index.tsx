"use client";

import { useMemo, useState } from "react";
import AttackMatrixComponent from "@features/shared/heatmap/attack-matrix";
import { buildOperationHeatmapData, buildOperationOverlayForAnalytics } from "@lib/heatmap/operationAdapter";
import { buildAnalyticsHeatmapData } from "@lib/heatmap/analyticsAdapter";
import { api, type RouterOutputs } from "@/trpc/react";
import { Segmented } from "@components/ui/segmented";

type Operation = RouterOutputs["operations"]["getById"];

interface AttackMatrixProps {
  operation: Operation;
}

export default function AttackMatrix({ operation }: AttackMatrixProps) {
  const [viewMode, setViewMode] = useState<"operation" | "global">("operation");
  const [split, setSplit] = useState(true);

  const opRows = useMemo(() => buildOperationHeatmapData(operation), [operation]);

  const overlay = useMemo(() => buildOperationOverlayForAnalytics(operation), [operation]);
  const { data: metrics, isLoading } = api.analytics.coverage.techniqueMetrics.useQuery(undefined, { enabled: viewMode === "global" });
  // Build sub-technique index for this operation so the split toggle works in All ATT&CK view
  const opSubIndex = useMemo(() => {
    const map = new Map<string, { id: string; name: string; executed?: boolean }[]>();
    const add = (techId: string, subId: string, subName: string, executed: boolean) => {
      const list = map.get(techId) ?? [];
      // de-dupe by sub-technique id
      if (!list.some((s) => s.id === subId)) list.push({ id: subId, name: subName, executed });
      map.set(techId, list);
    };
    for (const t of operation.techniques) {
      const st = t.mitreSubTechnique;
      if (!st) continue;
      const executed = !!t.startTime;
      add(st.techniqueId, st.id, st.name, executed);
    }
    return map;
  }, [operation]);

  const globalRows = useMemo(() => {
    const base = buildAnalyticsHeatmapData(metrics ?? [], overlay);
    // Attach this operation's sub-techniques so expand/collapse works
    base.forEach((r) => {
      const subs = opSubIndex.get(r.techniqueId) ?? [];
      r.subTechs = subs;
    });
    return base;
  }, [metrics, overlay, opSubIndex]);

  const rows = viewMode === "operation" ? opRows : globalRows;
  const mode = viewMode === "operation" ? "operation" : "analytics" as const;
  const title = viewMode === "operation" ? "Operation ATT&CK Technique Matrix" : "All ATT&CK Technique Matrix";

  return (
    <div className="space-y-3">
      <Segmented
        options={[{ label: 'Operation', value: 'operation' }, { label: 'All ATT&CK', value: 'global' }]}
        value={viewMode}
        onChange={setViewMode}
      />
      {viewMode === "global" && isLoading ? (
        <div className="flex justify-center items-center h-64 text-[var(--color-text-secondary)]">Loading ATT&CK dataset...</div>
      ) : (
        <AttackMatrixComponent
          rows={rows}
          mode={mode}
          title={title}
          splitSubTechniques={split}
          onToggleSplit={setSplit}
        />
      )}
    </div>
  );
}
