import { describe, expect, it } from "vitest";
import { OutcomeStatus, OutcomeType } from "@prisma/client";
import {
  calculateAverageResponseMilliseconds,
  summarizeOutcomeMetrics,
  summarizeTechniqueOutcomeMetrics,
  type OutcomeLike,
  type TechniqueLike,
} from "@/lib/outcomeMetrics";

describe("outcomeMetrics", () => {
  const detectionSuccess: OutcomeLike = {
    type: OutcomeType.DETECTION,
    status: OutcomeStatus.DETECTED,
    detectionTime: new Date("2024-01-01T01:00:00Z"),
  };

  const detectionMiss: OutcomeLike = {
    type: OutcomeType.DETECTION,
    status: OutcomeStatus.MISSED,
  };

  const preventionSuccess: OutcomeLike = {
    type: OutcomeType.PREVENTION,
    status: OutcomeStatus.PREVENTED,
  };

  const attributionSuccess: OutcomeLike = {
    type: OutcomeType.ATTRIBUTION,
    status: OutcomeStatus.ATTRIBUTED,
    detectionTime: new Date("2024-01-01T02:00:00Z"),
  };

  it("summarizes flat outcome collections", () => {
    const summary = summarizeOutcomeMetrics([
      detectionSuccess,
      detectionMiss,
      preventionSuccess,
      { ...preventionSuccess, status: OutcomeStatus.MISSED },
      { type: OutcomeType.DETECTION, status: OutcomeStatus.NOT_APPLICABLE },
    ]);

    expect(summary[OutcomeType.DETECTION]).toEqual({ attempts: 2, successes: 1, successRate: 50 });
    expect(summary[OutcomeType.PREVENTION]).toEqual({ attempts: 2, successes: 1, successRate: 50 });
    expect(summary[OutcomeType.ATTRIBUTION]).toEqual({ attempts: 0, successes: 0, successRate: 0 });
  });

  it("summarizes outcomes nested under techniques", () => {
    const techniques: TechniqueLike[] = [
      { startTime: new Date("2024-01-01T00:00:00Z"), outcomes: [detectionSuccess, preventionSuccess] },
      { startTime: new Date("2024-01-02T00:00:00Z"), outcomes: [detectionMiss, attributionSuccess] },
      { startTime: null, outcomes: [null, undefined] },
    ];

    const summary = summarizeTechniqueOutcomeMetrics(techniques);

    expect(summary[OutcomeType.DETECTION]).toEqual({ attempts: 2, successes: 1, successRate: 50 });
    expect(summary[OutcomeType.PREVENTION]).toEqual({ attempts: 1, successes: 1, successRate: 100 });
    expect(summary[OutcomeType.ATTRIBUTION]).toEqual({ attempts: 1, successes: 1, successRate: 100 });
  });

  it("calculates average response time in milliseconds", () => {
    const techniques: TechniqueLike[] = [
      {
        startTime: new Date("2024-01-01T00:00:00Z"),
        outcomes: [
          { type: OutcomeType.DETECTION, status: OutcomeStatus.DETECTED, detectionTime: new Date("2024-01-01T00:10:00Z") },
        ],
      },
      {
        startTime: "2024-01-02T00:00:00Z",
        outcomes: [
          { type: OutcomeType.DETECTION, status: OutcomeStatus.DETECTED, detectionTime: "2024-01-02T00:20:00Z" },
        ],
      },
      {
        // Ignore invalid/negative durations
        startTime: "2024-01-03T00:00:00Z",
        outcomes: [
          { type: OutcomeType.DETECTION, status: OutcomeStatus.DETECTED, detectionTime: "2023-12-31T23:59:00Z" },
        ],
      },
    ];

    const averageMs = calculateAverageResponseMilliseconds(techniques, OutcomeType.DETECTION);
    expect(averageMs).toBe(15 * 60 * 1000);
  });

  it("returns null when no valid durations exist", () => {
    const techniques: TechniqueLike[] = [
      { startTime: undefined, outcomes: [detectionSuccess] },
      { startTime: new Date("2024-01-01T00:00:00Z"), outcomes: [] },
    ];

    const averageMs = calculateAverageResponseMilliseconds(techniques, OutcomeType.DETECTION);
    expect(averageMs).toBeNull();
  });
});
