import { useMemo, useCallback } from "react";
import { api } from "@/trpc/react";
import type { TimeRange } from "@features/shared/time-range-filter";
import { formatDate, formatMonthYear } from "@lib/formatDate";

export interface TrendPoint {
  date: string;
  period: string;
  operations: number;
  techniques: number;
  detectionRate: number | null;
  preventionRate: number | null;
  attributionRate: number | null;
  avgTimeToDetect: number | null;
  avgTimeToAttribute: number | null;
}

export interface OperationTimelinePoint {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
}

interface Params {
  range: TimeRange;
  customStartDate: string;
  customEndDate: string;
  selectedTagIds: string[];
}

interface PeriodParams {
  period: "30d" | "90d" | "1y" | "all";
  groupBy: "week" | "month";
}

export function useTrendsData({
  range,
  customStartDate,
  customEndDate,
  selectedTagIds,
}: Params) {
  const getPeriodParams = (): PeriodParams => {
    if (range === "custom" && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      const daysDiff = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );

      let apiPeriod: "30d" | "90d" | "1y" | "all";
      let groupBy: "week" | "month";

      if (daysDiff <= 60) {
        apiPeriod = "30d";
        groupBy = "week";
      } else if (daysDiff <= 180) {
        apiPeriod = "90d";
        groupBy = "month";
      } else {
        apiPeriod = "1y";
        groupBy = "month";
      }

      return { period: apiPeriod, groupBy };
    }

    const periodMap = {
      all: { period: "all" as const, groupBy: "month" as const },
      month: { period: "30d" as const, groupBy: "week" as const },
      quarter: { period: "90d" as const, groupBy: "month" as const },
      year: { period: "1y" as const, groupBy: "month" as const },
      custom: { period: "30d" as const, groupBy: "week" as const },
    } as const;

    return periodMap[range];
  };

  const periodParams = getPeriodParams();

  const { data: operationTrendData, isLoading: operationsLoading } =
    api.analytics.trends.operations.useQuery({
      period: periodParams.period,
      groupBy: periodParams.groupBy,
      tagIds: selectedTagIds.length ? selectedTagIds : undefined,
    });

  const { data: effectivenessTrendData, isLoading: effectivenessLoading } =
    api.analytics.trends.effectiveness.useQuery({
      period: periodParams.period,
      groupBy: periodParams.groupBy,
      tagIds: selectedTagIds.length ? selectedTagIds : undefined,
    });

  const { data: operationTimelineData, isLoading: timelineLoading } =
    api.analytics.trends.operationTimeline.useQuery({
      period: periodParams.period,
      tagIds: selectedTagIds.length ? selectedTagIds : undefined,
    });

  const isLoading =
    operationsLoading || effectivenessLoading || timelineLoading;

  const generateBuckets = (
    period: PeriodParams["period"],
    groupBy: PeriodParams["groupBy"],
    ops: { date: string }[],
    eff: { date: string }[],
  ) => {
    const now = new Date();
    let start = new Date(now);
    if (period === "30d") start.setDate(now.getDate() - 30);
    else if (period === "90d") start.setDate(now.getDate() - 90);
    else if (period === "1y") start.setFullYear(now.getFullYear() - 1);
    else {
      const allDates = [...ops.map((o) => o.date), ...eff.map((e) => e.date)];
      if (allDates.length > 0) {
        allDates.sort();
        start = new Date(allDates[0]!);
      } else start.setFullYear(now.getFullYear() - 1);
    }

    const buckets: string[] = [];
    if (groupBy === "week") {
      start.setDate(start.getDate() - start.getDay());
      for (let d = new Date(start); d <= now; d.setDate(d.getDate() + 7)) {
        buckets.push(d.toISOString().split("T")[0]!);
      }
    } else {
      start = new Date(start.getFullYear(), start.getMonth(), 1);
      for (let d = new Date(start); d <= now; d.setMonth(d.getMonth() + 1)) {
        buckets.push(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        );
      }
    }
    return buckets;
  };

  const formatPeriod = useCallback(
    (periodStr: string) => {
      if (periodParams.groupBy === "week") return formatDate(periodStr);
      if (periodParams.groupBy === "month") return formatMonthYear(periodStr);
      return periodStr;
    },
    [periodParams.groupBy],
  );

  const chartData: TrendPoint[] = useMemo(() => {
    const ops = operationTrendData ?? [];
    const eff = effectivenessTrendData ?? [];

    const buckets = generateBuckets(
      periodParams.period,
      periodParams.groupBy,
      ops,
      eff,
    );

    return buckets.map((date) => {
      const opData = ops.find((d) => d.date === date);
      const effData = eff.find((d) => d.date === date);
      const item: TrendPoint = {
        date,
        period: date,
        operations: opData?.total ?? 0,
        techniques: opData?.techniqueCount ?? 0,
        detectionRate: effData?.detectionRate ?? null,
        preventionRate: effData?.preventionRate ?? null,
        attributionRate: effData?.attributionRate ?? null,
        avgTimeToDetect: effData?.avgTimeToDetect ?? null,
        avgTimeToAttribute: effData?.avgTimeToAttribute ?? null,
      };
      return { ...item, period: formatPeriod(item.period) };
    });
  }, [operationTrendData, effectivenessTrendData, periodParams, formatPeriod]);

  const timelineData: OperationTimelinePoint[] = useMemo(
    () => (operationTimelineData ?? []).map((item) => ({ ...item })),
    [operationTimelineData],
  );

  return { chartData, timelineData, isLoading };
}
