"use client";

import { useMemo, useRef } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ScatterCustomizedShape, ScatterPointItem } from "recharts/types/cartesian/Scatter";
import { CalendarClock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportToPngButton } from "@features/shared/export";
import { formatDate, formatMonthYear } from "@/lib/formatDate";
import { AttackTimelineTooltip } from "./attack-timeline-tooltip";
import type {
  Operation,
  TechniqueScatterPoint,
  TechniqueTimelineDatum,
  Technique,
} from "./types";

interface AttackTimelineProps {
  operation: Operation;
}

const startDot: ScatterCustomizedShape = (props: unknown) => {
  const { cx, cy } = props as ScatterPointItem;
  if (typeof cx !== "number" || typeof cy !== "number") {
    return <></>;
  }

  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill="var(--color-accent)"
      stroke="var(--color-surface)"
      strokeWidth={2}
    />
  );
};

const endDot: ScatterCustomizedShape = (props: unknown) => {
  const { cx, cy } = props as ScatterPointItem;
  if (typeof cx !== "number" || typeof cy !== "number") {
    return <></>;
  }

  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill="var(--color-surface)"
      stroke="var(--color-text-primary)"
      strokeWidth={2}
    />
  );
};

const isScatterPointWithPayload = (
  value: unknown,
): value is ScatterPointItem & { payload?: unknown } => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { cx?: unknown; cy?: unknown };
  return typeof candidate.cx === "number" && typeof candidate.cy === "number";
};

const toSafeTimestamp = (value: Date | string | null | undefined) => {
  if (!value) return null;
  const timestamp = typeof value === "string" ? new Date(value).getTime() : value.getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const getExecutionStatusColor = (
  executedSuccessfully: boolean | null | undefined,
): string => {
  if (executedSuccessfully === true) {
    return "var(--status-success-fg)";
  }
  if (executedSuccessfully === false) {
    return "var(--status-error-fg)";
  }
  return "var(--status-warn-fg)";
};

const executionOutcomeShape: ScatterCustomizedShape = (props: unknown) => {
  if (!isScatterPointWithPayload(props)) {
    return <></>;
  }

  const cx = props.cx!;
  const cy = props.cy!;
  const payload = (props as { payload?: unknown }).payload;
  if (!payload || typeof payload !== "object") {
    return <></>;
  }

  const executedSuccessfully = (payload as { executedSuccessfully?: boolean | null | undefined })
    .executedSuccessfully;
  const fill = getExecutionStatusColor(executedSuccessfully);

  return (
    <circle cx={cx} cy={cy} r={5} fill={fill} stroke="var(--color-surface)" strokeWidth={2} />
  );
};

const buildTechniqueLabel = (technique: Technique) => {
  const id = technique.mitreSubTechnique?.id ?? technique.mitreTechnique?.id ?? "CUSTOM";
  const name = technique.mitreSubTechnique?.name ?? technique.mitreTechnique?.name ?? "Custom Technique";
  return `${id} — ${name}`;
};

export default function AttackTimeline({ operation }: AttackTimelineProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const {
    chartData,
    startPoints,
    endPoints,
    executionPoints,
    domain,
    baseTimestamp,
    chartHeight,
  } = useMemo(() => {
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
        outcomes: technique.outcomes,
        offset: 0,
        duration: 0,
        tooltipType: "technique",
      });
    }

    if (candidates.length === 0 || earliest == null || latest == null) {
      const now = Date.now();
      return {
        chartData: [] as TechniqueTimelineDatum[],
        startPoints: [] as TechniqueScatterPoint[],
        endPoints: [] as TechniqueScatterPoint[],
        executionPoints: [] as TechniqueScatterPoint[],
        domain: [0, 1] as [number, number],
        baseTimestamp: now,
        chartHeight: 320,
      };
    }

    const baseTimestamp = earliest;
    let maxTimestamp = latest;

    const chartData = candidates.map((item) => {
      const endTimestamp =
        item.endTimestamp != null && item.endTimestamp >= item.startTimestamp
          ? item.endTimestamp
          : item.startTimestamp;
      if (endTimestamp > maxTimestamp) {
        maxTimestamp = endTimestamp;
      }

      return {
        ...item,
        offset: item.startTimestamp - baseTimestamp,
        duration: Math.max(0, endTimestamp - item.startTimestamp),
      } satisfies TechniqueTimelineDatum;
    });

    const startPoints: TechniqueScatterPoint[] = chartData.map((item) => ({
      ...item,
      x: item.offset,
      y: item.label,
    }));

    const endPoints: TechniqueScatterPoint[] = chartData
      .filter((item) => item.endTimestamp && item.endTimestamp > item.startTimestamp)
      .map((item) => ({
        ...item,
        x: (item.endTimestamp ?? item.startTimestamp) - baseTimestamp,
        y: item.label,
      }));

    const executionPoints: TechniqueScatterPoint[] = chartData.map((item) => ({
      ...item,
      x:
        (item.endTimestamp != null && item.endTimestamp >= item.startTimestamp
          ? item.endTimestamp
          : item.startTimestamp) - baseTimestamp,
      y: item.label,
    }));

    const span = Math.max(maxTimestamp - baseTimestamp, 24 * 60 * 60 * 1000);
    const chartHeight = Math.max(320, chartData.length * 56);

    return {
      chartData,
      startPoints,
      endPoints,
      executionPoints,
      domain: [0, span] as [number, number],
      baseTimestamp,
      chartHeight,
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

  return (
    <Card ref={cardRef}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-xl font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-[var(--color-accent)]" />
            Attack Timeline
          </CardTitle>
          <CardDescription>
            Visualizes technique execution windows and execution results for this operation.
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
            No timeline data yet. Add execution times or outcomes to populate this view.
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={chartHeight}>
              <ComposedChart
                layout="vertical"
                data={chartData}
                margin={{ top: 16, right: 32, bottom: 16, left: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  type="number"
                  domain={domain}
                  tickFormatter={tickFormatter}
                  stroke="var(--color-text-muted)"
                  tick={{ fontSize: 12 }}
                />
                <YAxis dataKey="label" type="category" width={200} tick={{ fontSize: 12 }} />
                <Tooltip
                  cursor={{ fill: "var(--color-surface-muted)", fillOpacity: 0.25 }}
                  content={<AttackTimelineTooltip baseTimestamp={baseTimestamp} />}
                />
                <Bar dataKey="offset" stackId="timeline" fill="transparent" isAnimationActive={false} />
                <Bar
                  dataKey="duration"
                  stackId="timeline"
                  fill="var(--color-accent)"
                  radius={[999, 999, 999, 999]}
                  barSize={12}
                />
                <Scatter data={startPoints} shape={startDot} />
                <Scatter data={endPoints} shape={endDot} />
                <Scatter data={executionPoints} shape={executionOutcomeShape} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--color-text-muted)]">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-6 rounded-full bg-[var(--color-accent)]" />
                Execution window
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 items-center justify-center">
                  <span className="h-3 w-3 rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-accent)]" />
                </span>
                Start
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 items-center justify-center">
                  <span className="h-3 w-3 rounded-full border-2 border-[var(--color-text-primary)] bg-[var(--color-surface)]" />
                </span>
                End
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border-2 border-[var(--color-surface)] bg-[var(--status-success-fg)]" />
                Successful execution
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border-2 border-[var(--color-surface)] bg-[var(--status-error-fg)]" />
                Failed execution
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border-2 border-[var(--color-surface)] bg-[var(--status-warn-fg)]" />
                Not recorded
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
