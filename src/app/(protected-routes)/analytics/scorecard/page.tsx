"use client";

import { useState } from "react";
import { api } from "@/trpc/react";
import { BarChart as BarChartIcon } from "lucide-react";
import { TimeRangeFilter, type TimeRange } from "@features/shared/time-range-filter";
import { useDateRange } from "@features/shared/use-date-range";
import { SummarySection } from "@features/analytics/components/scorecard/summary-section";
import { ExecutionOutcomesSection } from "@features/analytics/components/scorecard/execution-outcomes-section";
import { ResponseTimingSection } from "@features/analytics/components/scorecard/response-timing-section";
import { TacticResilienceSection } from "@features/analytics/components/scorecard/tactic-resilience-section";
import { DefensiveToolsSection } from "@features/analytics/components/scorecard/defensive-tools-section";
import { ThreatCoverageSection } from "@features/analytics/components/scorecard/threat-coverage-section";
import { ScorecardMetricsProvider } from "@features/analytics/components/scorecard/metrics-context";

export default function ScorecardPage() {
  const [range, setRange] = useState<TimeRange>("all");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const { start, end } = useDateRange(range, customStartDate, customEndDate);

  const { data: allTags } = api.taxonomy.tags.list.useQuery();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)] flex items-center gap-3">
          <BarChartIcon className="w-8 h-8 text-[var(--color-accent)]" />
          Scorecard
        </h1>
      </div>

      <TimeRangeFilter
        range={range}
        setRange={setRange}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
        selectedTagIds={selectedTagIds}
        setSelectedTagIds={setSelectedTagIds}
        allTags={allTags}
      />

      <ScorecardMetricsProvider start={start} end={end} tagIds={selectedTagIds.length ? selectedTagIds : undefined}>
        <SummarySection />
        <ThreatCoverageSection start={start} end={end} tagIds={selectedTagIds.length ? selectedTagIds : undefined} />
        <ExecutionOutcomesSection />
        <TacticResilienceSection start={start} end={end} tagIds={selectedTagIds.length ? selectedTagIds : undefined} />
        <DefensiveToolsSection start={start} end={end} tagIds={selectedTagIds.length ? selectedTagIds : undefined} />
        <ResponseTimingSection />
      </ScorecardMetricsProvider>
    </div>
  );
}
