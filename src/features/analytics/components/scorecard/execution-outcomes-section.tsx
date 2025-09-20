"use client";

import { useRef } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExportToPngButton } from "@features/shared/export";

import { ScorecardCardSkeleton } from "./scorecard-card-skeleton";
import { useScorecardMetrics } from "./metrics-context";

export function ExecutionOutcomesSection() {
  const cardRef = useRef<HTMLDivElement>(null);
  const { metrics, isLoading } = useScorecardMetrics();

  if (isLoading || !metrics) {
    return <ScorecardCardSkeleton bodyLines={5} />;
  }

  const { executed } = metrics.techniques;
  const tacticData = executed.byTactic;
  const maxTotal = tacticData.length ? Math.max(...tacticData.map((t) => t.total || 0), 1) : 1;

  return (
    <Card ref={cardRef}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-lg font-semibold text-[var(--color-text-primary)]">
          Execution Outcomes by Tactic
        </CardTitle>
        <ExportToPngButton targetRef={cardRef} fileName="scorecard-execution-outcomes" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-xs sm:text-sm">
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs">
            <Badge variant="success" className="pointer-events-none">Success</Badge>
            <Badge variant="error" className="pointer-events-none">Failure</Badge>
            <Badge
              variant="outline"
              className="pointer-events-none border-[var(--color-border-light)] bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]"
            >
              Unknown
            </Badge>
          </div>

          {tacticData.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">No executed techniques in this range.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {tacticData.map((tactic) => {
                const total = tactic.total || 0;
                const base = total || 1;
                const totalWidth = (total / maxTotal) * 100;
                const successWidth = (tactic.successes / base) * 100;
                const failureWidth = (tactic.failures / base) * 100;
                const unknownWidth = (tactic.unknown / base) * 100;
                const successLabel = `${tactic.successes} ${tactic.successes === 1 ? "success" : "successes"}`;
                const failureLabel = `${tactic.failures} ${tactic.failures === 1 ? "failure" : "failures"}`;
                const unknownLabel =
                  tactic.unknown > 0 ? `, ${tactic.unknown} unknown outcome${tactic.unknown === 1 ? "" : "s"}` : "";

                return (
                  <div
                    key={tactic.tacticId}
                    className="rounded-md border border-[var(--color-border-light)] bg-[var(--color-surface-muted)] p-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-medium leading-tight text-[var(--color-text-primary)]">
                        {tactic.tacticName}
                      </h3>
                      <span className="text-[11px] text-[var(--color-text-muted)] sm:text-xs">
                        {successLabel}, {failureLabel}
                        {unknownLabel}
                      </span>
                    </div>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-elevated)]">
                            <div className="flex h-full" style={{ width: `${totalWidth}%` }} aria-hidden>
                              {successWidth > 0 && (
                                <div
                                  className="h-full bg-[var(--status-success-fg)]"
                                  style={{ width: `${successWidth}%` }}
                                />
                              )}
                              {failureWidth > 0 && (
                                <div
                                  className="h-full bg-[var(--status-error-fg)]"
                                  style={{ width: `${failureWidth}%` }}
                                />
                              )}
                              {unknownWidth > 0 && (
                                <div
                                  className="h-full bg-[var(--color-border-light)]"
                                  style={{ width: `${unknownWidth}%` }}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
