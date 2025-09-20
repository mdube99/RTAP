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
import { CalendarRange } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExportToPngButton } from "@features/shared/export";
import { formatDate, formatMonthYear } from "@lib/formatDate";
import type { OperationTimelinePoint } from "./use-trends-data";
import { OperationTimelineTooltip } from "./operation-timeline-tooltip";

type ChartDatum = OperationTimelinePoint & {
  offset: number;
  duration: number;
  startX: number;
  endX: number;
};

interface Props {
  data: OperationTimelinePoint[];
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

export function OperationsTimelineChart({ data }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);

  const { chartData, domain, baseTimestamp } = useMemo(() => {
    if (data.length === 0) {
      const now = Date.now();
      return {
        chartData: [] as ChartDatum[],
        domain: [0, 1] as [number, number],
        baseTimestamp: now,
      };
    }

    const sorted = [...data].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

    const base = new Date(sorted[0]!.startDate).getTime();
    let max = base;

    const items = sorted.map<ChartDatum>((item) => {
      const startValue = new Date(item.startDate).getTime();
      const rawEnd = item.endDate ? new Date(item.endDate).getTime() : Date.now();
      const endValue = Math.max(rawEnd, startValue);

      if (endValue > max) {
        max = endValue;
      }

      return {
        ...item,
        offset: startValue - base,
        duration: endValue - startValue,
        startX: startValue - base,
        endX: endValue - base,
      };
    });

    const span = Math.max(max - base, 24 * 60 * 60 * 1000);

    return {
      chartData: items,
      domain: [0, span] as [number, number],
      baseTimestamp: base,
    };
  }, [data]);

  const startPoints = useMemo(
    () =>
      chartData.map((item) => ({
        x: item.startX,
        y: item.name,
        name: item.name,
        startDate: item.startDate,
        endDate: item.endDate,
      })),
    [chartData],
  );

  const endPoints = useMemo(
    () =>
      chartData
        .filter((item) => item.endDate)
        .map((item) => ({
          x: item.endX,
          y: item.name,
          name: item.name,
          startDate: item.startDate,
          endDate: item.endDate,
        })),
    [chartData],
  );

  const chartHeight = Math.max(260, chartData.length * 48);

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
            <CalendarRange className="w-6 h-6 text-[var(--color-accent)]" />
            Operation Timeline
          </CardTitle>
          <CardDescription>Visualizes operation spans from start to end dates.</CardDescription>
        </div>
        <ExportToPngButton targetRef={cardRef} fileName="trends-operation-timeline" />
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <ComposedChart
            layout="vertical"
            data={chartData}
            margin={{ top: 16, right: 24, bottom: 16, left: 16 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis
              type="number"
              domain={domain}
              tickFormatter={tickFormatter}
              stroke="var(--color-text-muted)"
              tick={{ fontSize: 12 }}
            />
            <YAxis dataKey="name" type="category" hide />
            <Tooltip
              content={<OperationTimelineTooltip />}
              cursor={{ fill: "var(--color-surface-muted)", fillOpacity: 0.3 }}
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
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
