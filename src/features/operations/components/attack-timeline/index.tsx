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
import { OutcomeStatus, OutcomeType } from "@prisma/client";
import { AttackTimelineTooltip } from "./attack-timeline-tooltip";
import type {
  Operation,
  OutcomeTimelinePoint,
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

const toneColorMap: Record<"success" | "error" | "warn" | "info", string> = {
  success: "var(--status-success-fg)",
  error: "var(--status-error-fg)",
  warn: "var(--status-warn-fg)",
  info: "var(--status-info-fg)",
};

const getOutcomeTone = (status: OutcomeStatus): keyof typeof toneColorMap => {
  if (status === OutcomeStatus.NOT_APPLICABLE) return "warn";
  if (status === OutcomeStatus.MISSED) return "error";
  if (
    status === OutcomeStatus.DETECTED ||
    status === OutcomeStatus.PREVENTED ||
    status === OutcomeStatus.ATTRIBUTED
  ) {
    return "success";
  }
  return "info";
};

const hasTooltipType = (value: unknown): value is { tooltipType?: unknown } =>
  typeof value === "object" && value !== null && "tooltipType" in value;

const isOutcomePoint = (value: unknown): value is OutcomeTimelinePoint =>
  hasTooltipType(value) && value.tooltipType === "outcome";

const isScatterPointWithPayload = (
  value: unknown,
): value is ScatterPointItem & { payload?: unknown } => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as { cx?: unknown; cy?: unknown };
  return typeof candidate.cx === "number" && typeof candidate.cy === "number";
};

const outcomeShape: ScatterCustomizedShape = (props: unknown) => {
  if (!isScatterPointWithPayload(props)) {
    return <></>;
  }

  const cx = props.cx!;
  const cy = props.cy!;
  const payload = (props as { payload?: unknown }).payload;
  if (!isOutcomePoint(payload)) {
    return <></>;
  }

  const tone = getOutcomeTone(payload.status);
  const fill = toneColorMap[tone];
  const stroke = "var(--color-surface)";
  const size = 7;

  if (payload.type === OutcomeType.DETECTION) {
    return <circle cx={cx} cy={cy} r={size} fill={fill} stroke={stroke} strokeWidth={2} />;
  }

  if (payload.type === OutcomeType.PREVENTION) {
    return (
      <rect
        x={cx - size}
        y={cy - size}
        width={size * 2}
        height={size * 2}
        rx={2}
        fill={fill}
        stroke={stroke}
        strokeWidth={2}
      />
    );
  }

  const points = [
    `${cx},${cy - size}`,
    `${cx + size},${cy}`,
    `${cx},${cy + size}`,
    `${cx - size},${cy}`,
  ].join(" ");

  return <polygon points={points} fill={fill} stroke={stroke} strokeWidth={2} />;
};

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

export default function AttackTimeline({ operation }: AttackTimelineProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const {
    chartData,
    startPoints,
    endPoints,
    outcomePoints,
    domain,
    baseTimestamp,
    chartHeight,
  } = useMemo(() => {
    const candidates: TechniqueTimelineDatum[] = [];

    for (const technique of operation.techniques) {
      const startTime = toSafeTimestamp(technique.startTime);
      const endTime = toSafeTimestamp(technique.endTime);
      const createdAt = toSafeTimestamp(technique.createdAt);
      const outcomeTimes = technique.outcomes
        .map((outcome) => toSafeTimestamp(outcome.detectionTime))
        .filter((value): value is number => value != null);

      const hasTimelineData = startTime != null || endTime != null || outcomeTimes.length > 0;
      if (!hasTimelineData) {
        continue;
      }

      const startCandidates = [startTime, createdAt, ...outcomeTimes].filter(
        (value): value is number => value != null,
      );

      if (startCandidates.length === 0) {
        continue;
      }

      const startTimestamp = startTime ?? Math.min(...startCandidates);
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
        endTimestamp: endTime,
        executedSuccessfully: technique.executedSuccessfully,
        outcomes: technique.outcomes,
        offset: 0,
        duration: 0,
        tooltipType: "technique",
      });
    }

    if (candidates.length === 0) {
      const now = Date.now();
      return {
        chartData: [] as TechniqueTimelineDatum[],
        startPoints: [] as TechniqueScatterPoint[],
        endPoints: [] as TechniqueScatterPoint[],
        outcomePoints: [] as OutcomeTimelinePoint[],
        domain: [0, 1] as [number, number],
        baseTimestamp: now,
        chartHeight: 320,
      };
    }

    const sorted = candidates.sort((a, b) => a.startTimestamp - b.startTimestamp);
    const baseTimestamp = sorted[0]!.startTimestamp;
    let maxTimestamp = baseTimestamp;

    const chartData = sorted.map((item) => {
      const safeEnd = item.endTimestamp ?? item.startTimestamp;
      if (safeEnd > maxTimestamp) {
        maxTimestamp = safeEnd;
      }

      return {
        ...item,
        offset: item.startTimestamp - baseTimestamp,
        duration: Math.max(0, safeEnd - item.startTimestamp),
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

    const outcomePoints: OutcomeTimelinePoint[] = [];

    for (const item of chartData) {
      for (const outcome of item.outcomes) {
        const outcomeTime = toSafeTimestamp(outcome.detectionTime);
        const fallbackTime = outcomeTime ?? item.endTimestamp ?? item.startTimestamp;
        const timestamp = fallbackTime;
        if (timestamp > maxTimestamp) {
          maxTimestamp = timestamp;
        }
        outcomePoints.push({
          techniqueId: item.techniqueId,
          label: item.label,
          tacticName: item.tacticName,
          type: outcome.type,
          status: outcome.status,
          timestamp,
          detectionTime: outcomeTime != null ? new Date(outcomeTime).toISOString() : null,
          usedFallbackTimestamp: outcomeTime == null,
          tooltipType: "outcome",
          x: timestamp - baseTimestamp,
          y: item.label,
        });
      }
    }

    const span = Math.max(maxTimestamp - baseTimestamp, 24 * 60 * 60 * 1000);
    const chartHeight = Math.max(320, chartData.length * 56);

    return {
      chartData,
      startPoints,
      endPoints,
      outcomePoints,
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
            Visualizes technique execution windows and defensive outcomes for this operation.
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
                <Scatter data={outcomePoints} shape={outcomeShape} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--color-text-muted)]">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-6 rounded-full bg-[var(--color-accent)]" />
                Execution window
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 items-center justify-center">
                  <span className="h-3 w-3 rounded-full border border-[var(--color-surface)] bg-[var(--status-info-fg)]" />
                </span>
                Detection
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 items-center justify-center">
                  <span className="h-3 w-3 rounded border border-[var(--color-surface)] bg-[var(--status-success-fg)]" />
                </span>
                Prevention
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-3 w-3 items-center justify-center">
                  <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden>
                    <polygon
                      points="6,0 12,6 6,12 0,6"
                      fill="var(--status-success-fg)"
                      stroke="var(--color-surface)"
                      strokeWidth={1.5}
                    />
                  </svg>
                </span>
                Attribution
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[var(--status-success-fg)]" />
                Success
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[var(--status-error-fg)]" />
                Missed
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[var(--status-warn-fg)]" />
                Not applicable
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
