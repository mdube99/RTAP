"use client";

import { useMemo, useRef } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarClock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportToPngButton } from "@features/shared/export";
import { formatDate, formatMonthYear } from "@/lib/formatDate";
import { AttackTimelineTooltip } from "./attack-timeline-tooltip";
import type { Operation, TechniqueTimelineDatum, Technique } from "./types";

interface AttackTimelineProps {
  operation: Operation;
}

const toSafeTimestamp = (value: Date | string | null | undefined) => {
  if (!value) return null;
  const timestamp = typeof value === "string" ? new Date(value).getTime() : value.getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const buildTechniqueLabel = (technique: Technique) => {
  const id = technique.mitreSubTechnique?.id ?? technique.mitreTechnique?.id ?? "CUSTOM";
  const name = technique.mitreSubTechnique?.name ?? technique.mitreTechnique?.name ?? "Custom Technique";
  return `${id} — ${name}`;
};

const MIN_CHART_HEIGHT = 160;
const MIN_BAR_SIZE = 10;
const MAX_BAR_SIZE = 18;
const MIN_TIMESPAN_MS = 15 * 60 * 1000;
const MIN_PADDING_MS = 5 * 60 * 1000;
const SPAN_PADDING_RATIO = 0.1;

const getRowHeight = (count: number) => {
  if (count <= 4) return 28;
  if (count <= 8) return 32;
  if (count <= 12) return 36;
  return 40;
};

export default function AttackTimeline({ operation }: AttackTimelineProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const { chartData, domain, baseTimestamp, chartHeight, barSize } = useMemo(() => {
    const candidates: TechniqueTimelineDatum[] = [];
    let earliest: number | null = null;
    let latest: number | null = null;

    for (const technique of operation.techniques) {
      const startTime = toSafeTimestamp(technique.startTime);
      const endTime = toSafeTimestamp(technique.endTime);
      const createdAt = toSafeTimestamp(technique.createdAt);

      const startTimestamp = startTime ?? createdAt ?? endTime;
      if (startTimestamp == null) {
        continue;
      }

      const safeEnd = endTime != null && endTime > startTimestamp ? endTime : startTimestamp;

      earliest = earliest == null ? startTimestamp : Math.min(earliest, startTimestamp);
      latest = latest == null ? safeEnd : Math.max(latest, safeEnd);

      const techniqueName = technique.mitreSubTechnique?.name ?? technique.mitreTechnique?.name ?? "Custom Technique";
      const tacticName = technique.mitreTechnique?.tactic?.name ?? null;
      const label = buildTechniqueLabel(technique);

      candidates.push({
        techniqueId: technique.id,
        label,
        techniqueName,
        tacticName,
        startDate: new Date(startTimestamp).toISOString(),
        endDate: endTime != null ? new Date(endTime).toISOString() : null,
        startTimestamp,
        endTimestamp: endTime ?? null,
        executedSuccessfully: technique.executedSuccessfully,
        outcomes: technique.outcomes ?? [],
        offset: 0,
        duration: 0,
        tooltipType: "technique",
      });
    }

    if (candidates.length === 0 || earliest == null || latest == null) {
      const now = Date.now();
      return {
        chartData: [] as TechniqueTimelineDatum[],
        domain: [0, 1] as [number, number],
        baseTimestamp: now,
        chartHeight: MIN_CHART_HEIGHT,
        barSize: MIN_BAR_SIZE,
      };
    }

    const baseTimestamp = earliest;
    let maxTimestamp = latest;

    const chartData = candidates
      .map((item) => {
        const endTimestamp =
          item.endTimestamp != null && item.endTimestamp >= item.startTimestamp
            ? item.endTimestamp
            : item.startTimestamp;
        if (endTimestamp > maxTimestamp) {
          maxTimestamp = endTimestamp;
        }

        const offset = item.startTimestamp - baseTimestamp;
        const duration = Math.max(0, endTimestamp - item.startTimestamp);

        if (!Number.isFinite(offset) || !Number.isFinite(duration)) {
          return null;
        }

        return {
          ...item,
          offset,
          duration,
        } satisfies TechniqueTimelineDatum;
      })
      .filter((value): value is TechniqueTimelineDatum => value !== null);

    if (chartData.length === 0) {
      const now = Date.now();
      return {
        chartData: [] as TechniqueTimelineDatum[],
        domain: [0, 1] as [number, number],
        baseTimestamp: now,
        chartHeight: MIN_CHART_HEIGHT,
        barSize: MIN_BAR_SIZE,
      };
    }

    const rawSpan = Math.max(maxTimestamp - baseTimestamp, 0);
    const spanBase = rawSpan === 0 ? MIN_TIMESPAN_MS : rawSpan;
    const paddedSpan = spanBase + Math.max(MIN_PADDING_MS, Math.round(spanBase * SPAN_PADDING_RATIO));
    const rowCount = chartData.length;
    const rowHeight = getRowHeight(rowCount);
    const chartHeight = Math.max(MIN_CHART_HEIGHT, rowCount * rowHeight + 48);
    const computedBarSize = Math.round(rowHeight * 0.6);
    const barSize = Math.min(MAX_BAR_SIZE, Math.max(MIN_BAR_SIZE, computedBarSize));

    return {
      chartData,
      domain: [0, paddedSpan] as [number, number],
      baseTimestamp,
      chartHeight,
      barSize,
    };
  }, [operation.techniques]);

  const spanInMs = domain[1];
  const useMonthTicks = spanInMs > 1000 * 60 * 60 * 24 * 120;
  const includeYear = useMemo(() => {
    const start = new Date(baseTimestamp);
    const end = new Date(baseTimestamp + spanInMs);
    return start.getFullYear() !== end.getFullYear();
  }, [baseTimestamp, spanInMs]);

  const tickFormatter = (value: number) => {
    const date = new Date(baseTimestamp + value);
    if (useMonthTicks) {
      return formatMonthYear(date);
    }
    return formatDate(date, { includeYear });
  };

  const yAxisTicks = useMemo(() => chartData.map((item) => item.techniqueId), [chartData]);
  const labelLookup = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of chartData) {
      map.set(item.techniqueId, item.label);
    }
    return map;
  }, [chartData]);

  const formatTechniqueLabel = (value: string | number) => {
    if (typeof value !== "string") return "";
    return labelLookup.get(value) ?? value;
  };

  return (
    <Card ref={cardRef}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-[var(--color-accent)]" />
            Attack Timeline
          </CardTitle>
          <CardDescription>
            Visualizes technique execution windows for this operation.
          </CardDescription>
        </div>
        <ExportToPngButton
          targetRef={cardRef}
          fileName={`operation-${operation.id}-attack-timeline`}
        />
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">
            No timeline data yet. Add execution times to populate this view.
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart
                layout="vertical"
                data={chartData}
                margin={{ top: 24, right: 32, bottom: 24, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  type="number"
                  domain={domain}
                  tickFormatter={tickFormatter}
                  stroke="var(--color-text-muted)"
                  tick={{ fontSize: 12 }}
                />
                <YAxis
                  dataKey="techniqueId"
                  type="category"
                  width={240}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 12, fill: "var(--color-text-primary)" }}
                  interval={0}
                  ticks={yAxisTicks}
                  tickFormatter={formatTechniqueLabel}
                  padding={{ top: 12, bottom: 12 }}
                />
                <Tooltip
                  cursor={{ fill: "var(--color-surface-muted)", fillOpacity: 0.25 }}
                  content={<AttackTimelineTooltip />}
                />
                <Bar dataKey="offset" stackId="timeline" fill="transparent" isAnimationActive={false} />
                <Bar
                  dataKey="duration"
                  stackId="timeline"
                  fill="var(--color-accent)"
                  radius={[999, 999, 999, 999]}
                  barSize={barSize}
                  minPointSize={4}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
