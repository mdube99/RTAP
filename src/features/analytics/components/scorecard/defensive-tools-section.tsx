"use client";
// PR2 move: features/analytics/components/scorecard

import { useRef } from "react";

import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Shield, AlertTriangle, Database } from "lucide-react";
import { ExportToPngButton } from "@features/shared/export";
import { ScorecardCardSkeleton } from "./scorecard-card-skeleton";

interface Props {
  start: Date;
  end: Date;
  tagIds?: string[];
}

export function DefensiveToolsSection({ start, end, tagIds }: Props) {
  const { data: toolData, isLoading } = api.analytics.tools.effectiveness.useQuery({ start, end, tagIds });
  const toolCardRef = useRef<HTMLDivElement>(null);
  const logCardRef = useRef<HTMLDivElement>(null);

  const getRateColor = (rate: number) => {
    if (rate >= 80) return "text-[var(--status-success-fg)]";
    if (rate >= 60) return "text-[var(--status-warn-fg)]";
    return "text-[var(--status-error-fg)]";
  };

  const getRateBg = (rate: number) => {
    if (rate >= 80) return "bg-[var(--status-success-fg)]";
    if (rate >= 60) return "bg-[var(--status-warn-fg)]";
    return "bg-[var(--status-error-fg)]";
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <ScorecardCardSkeleton bodyLines={5} />
        <ScorecardCardSkeleton bodyLines={5} />
      </div>
    );
  }

  const toolEffectiveness = toolData?.tools ?? [];
  const logSourceEffectiveness = toolData?.logSources ?? [];

  return (
    <div className="space-y-6">
      <Card ref={toolCardRef}>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Defensive Tool Effectiveness
          </CardTitle>
          <ExportToPngButton targetRef={toolCardRef} fileName="scorecard-defensive-tools" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {toolEffectiveness.map((tool) => (
              <Card key={tool.id} variant="default">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{tool.name}</CardTitle>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">Defensive Tool</p>
                </CardHeader>
                <CardContent>
                  {tool.totalUsage > 0 ? (
                    <div className="space-y-3">
                      {tool.detectionTotal > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-[var(--color-text-secondary)]">Detection</span>
                            <span className={`text-sm font-medium ${getRateColor(tool.detectionRate)}`}>{tool.detectionRate}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-[var(--color-surface)] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getRateBg(tool.detectionRate)}`}
                              style={{ width: `${tool.detectionRate}%` }}
                            />
                          </div>
                          <div className="text-xs text-[var(--color-text-muted)] mt-1">
                            {tool.detectionRate > 0 ? `${Math.round(tool.detectionTotal * tool.detectionRate / 100)}/${tool.detectionTotal}` : `0/${tool.detectionTotal}`} successful
                          </div>
                        </div>
                      )}

                      {tool.preventionTotal > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-[var(--color-text-secondary)]">Prevention</span>
                            <span className={`text-sm font-medium ${getRateColor(tool.preventionRate)}`}>{tool.preventionRate}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-[var(--color-surface)] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getRateBg(tool.preventionRate)}`}
                              style={{ width: `${tool.preventionRate}%` }}
                            />
                          </div>
                          <div className="text-xs text-[var(--color-text-muted)] mt-1">
                            {tool.preventionRate > 0 ? `${Math.round(tool.preventionTotal * tool.preventionRate / 100)}/${tool.preventionTotal}` : `0/${tool.preventionTotal}`} successful
                          </div>
                        </div>
                      )}

                      {tool.attributionTotal > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-[var(--color-text-secondary)]">Attribution</span>
                            <span className={`text-sm font-medium ${getRateColor(tool.attributionRate)}`}>{tool.attributionRate}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-[var(--color-surface)] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getRateBg(tool.attributionRate)}`}
                              style={{ width: `${tool.attributionRate}%` }}
                            />
                          </div>
                          <div className="text-xs text-[var(--color-text-muted)] mt-1">
                            {tool.attributionRate > 0 ? `${Math.round(tool.attributionTotal * tool.attributionRate / 100)}/${tool.attributionTotal}` : `0/${tool.attributionTotal}`} successful
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <AlertTriangle className="w-6 h-6 text-[var(--color-text-muted)] mx-auto mb-2" />
                      <p className="text-xs text-[var(--color-text-muted)]">Not yet utilized</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {toolEffectiveness.length === 0 && (
            <div className="text-center py-8 text-[var(--color-text-muted)]">No defensive tools configured</div>
          )}
        </CardContent>
      </Card>

      <Card ref={logCardRef}>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Log Source Effectiveness
          </CardTitle>
          <ExportToPngButton targetRef={logCardRef} fileName="scorecard-log-sources" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {logSourceEffectiveness.map((logSource) => (
              <Card key={logSource.id} variant="default">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">{logSource.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  {logSource.totalUsage > 0 ? (
                    <div className="space-y-3">
                      {logSource.detectionTotal > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-[var(--color-text-secondary)]">Detection</span>
                            <span className={`text-sm font-medium ${getRateColor(logSource.detectionRate)}`}>{logSource.detectionRate}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-[var(--color-surface)] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getRateBg(logSource.detectionRate)}`}
                              style={{ width: `${logSource.detectionRate}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {logSource.attributionTotal > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-[var(--color-text-secondary)]">Attribution</span>
                            <span className={`text-sm font-medium ${getRateColor(logSource.attributionRate)}`}>{logSource.attributionRate}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-[var(--color-surface)] rounded-full overflow-hidden">
                            <div
                              className={`h-full ${getRateBg(logSource.attributionRate)}`}
                              style={{ width: `${logSource.attributionRate}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <AlertTriangle className="w-6 h-6 text-[var(--color-text-muted)] mx-auto mb-2" />
                      <p className="text-xs text-[var(--color-text-muted)]">Not yet utilized</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
          {logSourceEffectiveness.length === 0 && (
            <div className="text-center py-8 text-[var(--color-text-muted)]">No log sources configured</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
