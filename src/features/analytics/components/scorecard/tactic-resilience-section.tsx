"use client";
// PR2 move: features/analytics/components/scorecard

import { useRef } from "react";

import { api } from "@/trpc/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { ExportToPngButton } from "@features/shared/export";
import { ScorecardCardSkeleton } from "./scorecard-card-skeleton";

interface Props {
  start: Date;
  end: Date;
  tagIds?: string[];
}

export function TacticResilienceSection({ start, end, tagIds }: Props) {
  const { data: tacticCoverage = [], isLoading } =
    api.analytics.coverage.byTactic.useQuery({
      start: start.toISOString(),
      end: end.toISOString(),
      tagIds,
    });
  const cardRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return <ScorecardCardSkeleton bodyLines={5} />;
  }

  const formatRate = (rate: number | null) =>
    rate === null ? "N/A" : `${rate}%`;

  const getRateColor = (rate: number | null) => {
    if (rate === null) return "text-[var(--color-text-muted)]";
    if (rate >= 80) return "text-[var(--status-success-fg)]";
    if (rate >= 60) return "text-[var(--status-warn-fg)]";
    return "text-[var(--status-error-fg)]";
  };

  const renderBar = (rate: number | null) => {
    if (rate === null)
      return (
        <div className="h-2 rounded-full bg-[var(--color-surface-elevated)]" />
      );

    return (
      <div className="flex h-2 overflow-hidden rounded-full bg-[var(--color-surface-elevated)]">
        <div
          className="h-full bg-[var(--status-success-fg)]"
          style={{ width: `${rate}%` }}
        />
        {rate < 100 && (
          <div
            className="h-full bg-[var(--status-error-fg)]"
            style={{ width: `${100 - rate}%` }}
          />
        )}
      </div>
    );
  };

  return (
    <Card ref={cardRef}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-xl font-semibold text-[var(--color-text-primary)]">
          Tactic Resilience
        </CardTitle>
        <ExportToPngButton
          targetRef={cardRef}
          fileName="scorecard-tactic-resilience"
        />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {tacticCoverage.map((tactic) => {
            const executedSummary =
              tactic.executedAttemptCount !== tactic.executedCount
                ? `${tactic.executedCount} unique executed (${tactic.executedAttemptCount} total runs)`
                : `${tactic.executedCount} executed`;

            return (
              <Card key={tactic.tacticId}>
                <CardContent className="p-4">
                  <div className="mb-3">
                    <h4 className="font-medium text-[var(--color-text-primary)]">
                      {tactic.tacticName}
                    </h4>
                    <p className="text-xs text-[var(--color-text-muted)]">
                      Techniques: {tactic.plannedCount} planned,{" "}
                      {executedSummary} across {tactic.operationCount}{" "}
                      operations
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-[var(--color-text-muted)]">
                          Detection
                        </span>
                        <span
                          className={`font-medium ${getRateColor(tactic.detectionRate)}`}
                        >
                          {formatRate(tactic.detectionRate)}
                          {` (${tactic.detectionCount})`}
                        </span>
                      </div>
                      {renderBar(tactic.detectionRate)}
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-[var(--color-text-muted)]">
                          Prevention
                        </span>
                        <span
                          className={`font-medium ${getRateColor(tactic.preventionRate)}`}
                        >
                          {formatRate(tactic.preventionRate)}
                          {` (${tactic.preventionCount})`}
                        </span>
                      </div>
                      {renderBar(tactic.preventionRate)}
                    </div>
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-[var(--color-text-muted)]">
                          Attribution
                        </span>
                        <span
                          className={`font-medium ${getRateColor(tactic.attributionRate)}`}
                        >
                          {formatRate(tactic.attributionRate)}
                          {` (${tactic.attributionCount})`}
                        </span>
                      </div>
                      {renderBar(tactic.attributionRate)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
