"use client";

import { useMemo, useRef, type RefObject } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Clock, Timer } from "lucide-react";
import { ExportToPngButton } from "@features/shared/export";

import { ScorecardCardSkeleton } from "./scorecard-card-skeleton";
import { useScorecardMetrics } from "./metrics-context";

const TIMING_BUCKETS = ["< 1 min", "1-5 min", "5-15 min", "15-60 min", "1-6 hrs", "6-24 hrs", "> 24 hrs"] as const;

type TimingBucket = (typeof TIMING_BUCKETS)[number];

type DistributionRecord = Record<TimingBucket, number>;

function buildRows(distribution: DistributionRecord) {
  const entries = TIMING_BUCKETS.map((bucket) => ({ bucket, count: distribution[bucket] ?? 0 }));
  const total = entries.reduce((acc, entry) => acc + entry.count, 0);
  return entries.map((entry) => ({ ...entry, total }));
}

function TimingCard({
  title,
  icon: Icon,
  distribution,
  samples,
  avg,
  emptyCopy,
  exportRef,
  exportName,
}: {
  title: string;
  icon: typeof Clock;
  distribution: DistributionRecord;
  samples: number;
  avg: number | null;
  emptyCopy: string;
  exportRef: RefObject<HTMLDivElement | null>;
  exportName: string;
}) {
  const rows = useMemo(() => buildRows(distribution), [distribution]);
  return (
    <Card ref={exportRef}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
        <ExportToPngButton targetRef={exportRef} fileName={exportName} />
      </CardHeader>
      <CardContent>
        {samples === 0 ? (
          <div className="py-6 text-center text-sm text-[var(--color-text-muted)]">{emptyCopy}</div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="flex items-baseline justify-between text-xs text-[var(--color-text-muted)]">
              <span>{samples} successful events with timing data</span>
              <span>
                Average: {avg !== null ? `${avg} min` : "N/A"}
              </span>
            </div>
            <div className="space-y-3">
              {rows.map(({ bucket, count, total }) => {
                const width = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={bucket}>
                    <div className="mb-1 flex justify-between text-xs text-[var(--color-text-secondary)]">
                      <span>{bucket}</span>
                      <span className="text-[var(--color-text-primary)]">{count}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-[var(--color-surface-muted)]">
                      <div
                        className="h-full rounded-full bg-[var(--status-success-fg)]"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ResponseTimingSection() {
  const detectionCardRef = useRef<HTMLDivElement>(null);
  const attributionCardRef = useRef<HTMLDivElement>(null);
  const { metrics, isLoading } = useScorecardMetrics();

  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <ScorecardCardSkeleton bodyLines={5} />
        <ScorecardCardSkeleton bodyLines={5} />
      </div>
    );
  }

  const { timing } = metrics;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <TimingCard
        title="Detection Time Distribution"
        icon={Clock}
        distribution={timing.detectionDistribution as DistributionRecord}
        samples={timing.detectionSamples}
        avg={timing.avgTimeToDetect}
        emptyCopy="No detection timing data captured in this range."
        exportRef={detectionCardRef}
        exportName="scorecard-detection-timing"
      />
      <TimingCard
        title="Attribution Time Distribution"
        icon={Timer}
        distribution={timing.attributionDistribution as DistributionRecord}
        samples={timing.attributionSamples}
        avg={timing.avgTimeToAttribute}
        emptyCopy="No attribution timing data captured in this range."
        exportRef={attributionCardRef}
        exportName="scorecard-attribution-timing"
      />
    </div>
  );
}
