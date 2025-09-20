import type { TechniqueRow } from "@features/shared/heatmap/attack-matrix";

export interface AnalyticsTechniqueMetric {
  techniqueId: string;
  techniqueName: string;
  tacticId: string;
  tacticName: string;
  executed?: boolean;
  executionCount: number;
  detectionRate: number;
  detectionAvailable?: boolean;
  preventionRate: number;
  preventionAvailable?: boolean;
  attributionRate: number;
  attributionAvailable?: boolean;
}

export function buildAnalyticsHeatmapData(metrics: AnalyticsTechniqueMetric[], overlay?: Map<string, { count: number; detectionRate: number; preventionRate: number; attributionRate: number }>): TechniqueRow[] {
  return metrics.map(m => ({
    techniqueId: m.techniqueId,
    techniqueName: m.techniqueName,
    tacticId: m.tacticId,
    tacticName: m.tacticName,
    executed: m.executed,
    executionCount: overlay?.get(m.techniqueId)?.count ?? m.executionCount,
    detectionRate: overlay?.get(m.techniqueId)?.detectionRate ?? m.detectionRate,
    detectionAvailable: m.detectionAvailable,
    preventionRate: overlay?.get(m.techniqueId)?.preventionRate ?? m.preventionRate,
    preventionAvailable: m.preventionAvailable,
    attributionRate: overlay?.get(m.techniqueId)?.attributionRate ?? m.attributionRate,
    attributionAvailable: m.attributionAvailable,
    subTechs: [],
  }));
}
