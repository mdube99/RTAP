"use client";

import { useMemo, useRef } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration } from "@/lib/formatDuration";
import { ExportToPngButton } from "@features/shared/export";

import { ScorecardCardSkeleton } from "./scorecard-card-skeleton";
import { useScorecardMetrics } from "./metrics-context";

export function SummarySection() {
  const cardRef = useRef<HTMLDivElement>(null);
  const { metrics, isLoading } = useScorecardMetrics();

  const crownJewelSummary = useMemo(() => {
    if (!metrics) {
      return { attemptsLabel: "0 of 0 attempts", operationsLabel: "" };
    }
    const { successes, attempts, operations } = metrics.crownJewelCompromises;
    const attemptsLabel = `${successes} of ${attempts} ${attempts === 1 ? "attempt" : "attempts"}`;
    const operationsLabel = operations > 0 ? ` across ${operations} operation${operations === 1 ? "" : "s"}` : "";
    return { attemptsLabel, operationsLabel };
  }, [metrics]);

  if (isLoading || !metrics) {
    return <ScorecardCardSkeleton bodyLines={6} />;
  }

  return (
    <Card ref={cardRef}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-lg font-semibold text-[var(--color-text-primary)]">
          Summary
        </CardTitle>
        <ExportToPngButton targetRef={cardRef} fileName="scorecard-summary" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-8 text-sm md:grid-cols-2">
          <div>
            <h3 className="mb-2 underline font-medium">Offensive Stats</h3>
            <dl className="space-y-1">
              <div className="flex items-center gap-2">
                <dt className="font-medium">Operations Completed:</dt>
                <dd>{metrics.operations}</dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="font-medium">Techniques Planned:</dt>
                <dd>{metrics.techniques.planned}</dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="font-medium">Techniques Executed:</dt>
                <dd>
                  {metrics.techniques.executed.successes} successes, {metrics.techniques.executed.failures} failures
                  {metrics.techniques.executed.unknown > 0
                    ? `, ${metrics.techniques.executed.unknown} unknown`
                    : ""}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="font-medium">Tactics Employed:</dt>
                <dd>{metrics.tactics}</dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="font-medium">Crown Jewel Compromises:</dt>
                <dd>
                  {crownJewelSummary.attemptsLabel}
                  {crownJewelSummary.operationsLabel}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="font-medium">Threat Actors Emulated:</dt>
                <dd>{metrics.threatActors}</dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="font-medium">Offensive Tools Used:</dt>
                <dd>{metrics.offensiveTools}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h3 className="mb-2 underline font-medium">Defensive Stats</h3>
            <dl className="space-y-1">
              <div className="flex items-center gap-2">
                <dt className="font-medium">Defensive Tools Assessed:</dt>
                <dd>{metrics.defensiveTools}</dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="font-medium">Average Time to Detect:</dt>
                <dd>
                  {metrics.timing.avgTimeToDetect !== null ? formatDuration(metrics.timing.avgTimeToDetect) : "N/A"}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="font-medium">Average Time to Attribute:</dt>
                <dd>
                  {metrics.timing.avgTimeToAttribute !== null ? formatDuration(metrics.timing.avgTimeToAttribute) : "N/A"}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="font-medium">Detection Success Rate:</dt>
                <dd>
                  {metrics.outcomes.detection.rate !== null
                    ? `${metrics.outcomes.detection.rate}% (${metrics.outcomes.detection.successes} / ${metrics.outcomes.detection.attempts})`
                    : "N/A"}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="font-medium">Prevention Success Rate:</dt>
                <dd>
                  {metrics.outcomes.prevention.rate !== null
                    ? `${metrics.outcomes.prevention.rate}% (${metrics.outcomes.prevention.successes} / ${metrics.outcomes.prevention.attempts})`
                    : "N/A"}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <dt className="font-medium">Attribution Success Rate:</dt>
                <dd>
                  {metrics.outcomes.attribution.rate !== null
                    ? `${metrics.outcomes.attribution.rate}% (${metrics.outcomes.attribution.successes} / ${metrics.outcomes.attribution.attempts})`
                    : "N/A"}
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-[var(--color-text-muted)]">
              Defensive metrics reflect outcomes captured for techniques executed during this date range.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
