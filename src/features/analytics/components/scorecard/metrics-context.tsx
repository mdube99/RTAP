"use client";

import { createContext, useContext, type ReactNode } from "react";

import { api, type RouterOutputs } from "@/trpc/react";

interface ProviderProps {
  start: Date;
  end: Date;
  tagIds?: string[];
  children: ReactNode;
}

type ScorecardMetrics = RouterOutputs["analytics"]["scorecard"]["metrics"];

interface ScorecardMetricsContextValue {
  metrics: ScorecardMetrics | null;
  isLoading: boolean;
  isFetching: boolean;
}

const ScorecardMetricsContext =
  createContext<ScorecardMetricsContextValue | null>(null);

export function ScorecardMetricsProvider({
  start,
  end,
  tagIds,
  children,
}: ProviderProps) {
  const { data, isLoading, isFetching } =
    api.analytics.scorecard.metrics.useQuery(
      { start: start.toISOString(), end: end.toISOString(), tagIds },
      { enabled: Boolean(start && end) },
    );

  return (
    <ScorecardMetricsContext.Provider
      value={{ metrics: data ?? null, isLoading, isFetching }}
    >
      {children}
    </ScorecardMetricsContext.Provider>
  );
}

export function useScorecardMetrics() {
  const ctx = useContext(ScorecardMetricsContext);
  if (!ctx) {
    throw new Error(
      "useScorecardMetrics must be used within a ScorecardMetricsProvider",
    );
  }
  return ctx;
}
