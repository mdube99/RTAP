import { OutcomeStatus, OutcomeType } from "@prisma/client";

export type OutcomeLike = {
  type: OutcomeType;
  status: OutcomeStatus;
  detectionTime?: Date | string | null;
};

export type TechniqueLike = {
  outcomes?: Array<OutcomeLike | null | undefined> | null;
  startTime?: Date | string | null;
};

export interface OutcomeMetric {
  attempts: number;
  successes: number;
  successRate: number;
}

export type OutcomeMetricsByType = Record<OutcomeType, OutcomeMetric>;

const SUCCESS_STATUS: Record<OutcomeType, OutcomeStatus> = {
  DETECTION: OutcomeStatus.DETECTED,
  PREVENTION: OutcomeStatus.PREVENTED,
  ATTRIBUTION: OutcomeStatus.ATTRIBUTED,
};

function createEmptyMetric(): OutcomeMetric {
  return { attempts: 0, successes: 0, successRate: 0 };
}

function parseDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isSuccessfulOutcome(outcome: OutcomeLike): boolean {
  return outcome.status === SUCCESS_STATUS[outcome.type];
}

export function summarizeOutcomeMetrics(
  outcomes: Iterable<OutcomeLike | null | undefined>
): OutcomeMetricsByType {
  const summary: OutcomeMetricsByType = {
    [OutcomeType.DETECTION]: createEmptyMetric(),
    [OutcomeType.PREVENTION]: createEmptyMetric(),
    [OutcomeType.ATTRIBUTION]: createEmptyMetric(),
  };

  for (const outcome of outcomes) {
    if (!outcome) continue;
    if (outcome.status === OutcomeStatus.NOT_APPLICABLE) continue;
    const bucket = summary[outcome.type];
    bucket.attempts += 1;
    if (isSuccessfulOutcome(outcome)) {
      bucket.successes += 1;
    }
  }

  for (const metric of Object.values(summary)) {
    metric.successRate = metric.attempts > 0 ? Math.round((metric.successes / metric.attempts) * 100) : 0;
  }

  return summary;
}

export function summarizeTechniqueOutcomeMetrics(
  techniques: Iterable<TechniqueLike | null | undefined>
): OutcomeMetricsByType {
  const outcomes: OutcomeLike[] = [];

  for (const technique of techniques) {
    if (!technique?.outcomes) continue;
    for (const outcome of technique.outcomes) {
      if (outcome) outcomes.push(outcome);
    }
  }

  return summarizeOutcomeMetrics(outcomes);
}

export type ResponseTimingType = Extract<OutcomeType, "DETECTION" | "ATTRIBUTION">;

export function calculateAverageResponseMilliseconds(
  techniques: Iterable<TechniqueLike | null | undefined>,
  outcomeType: ResponseTimingType
): number | null {
  const durations: number[] = [];

  for (const technique of techniques) {
    if (!technique?.outcomes?.length) continue;
    const start = parseDate(technique.startTime);
    if (!start) continue;

    const matchingOutcome = technique.outcomes.find((outcome) => outcome?.type === outcomeType);
    if (!matchingOutcome) continue;

    const eventTime = parseDate(matchingOutcome.detectionTime);
    if (!eventTime) continue;

    const diff = eventTime.getTime() - start.getTime();
    if (diff < 0) continue;

    durations.push(diff);
  }

  if (durations.length === 0) return null;

  const total = durations.reduce((sum, value) => sum + value, 0);
  return Math.round(total / durations.length);
}
