import type { OutcomeStatus, OutcomeType } from "@prisma/client";

export function buildCreateOutcomeData(
  overrides: Partial<{
    techniqueId: string;
    type: OutcomeType;
    status: OutcomeStatus;
    detectionTime?: string | null;
    notes?: string | null;
    screenshotUrl?: string | null;
    logData?: string | null;
    toolIds?: string[];
    logSourceIds?: string[];
  }> = {},
) {
  return {
    techniqueId: overrides.techniqueId ?? "technique-1",
    type: overrides.type ?? ("DETECTION" as OutcomeType),
    status: overrides.status ?? ("DETECTED" as OutcomeStatus),
    detectionTime: overrides.detectionTime ?? "2024-01-01T10:30:00.000Z",
    notes: overrides.notes ?? "Detected by EDR system",
    screenshotUrl:
      overrides.screenshotUrl ?? "/uploads/detection-screenshot.png",
    logData:
      overrides.logData ?? "Alert: Suspicious process execution detected",
    toolIds: overrides.toolIds ?? ["tool-1"],
    logSourceIds: overrides.logSourceIds ?? ["log-source-1"],
  };
}

export function buildMockOutcome(overrides: Partial<any> = {}) {
  return {
    id: overrides.id ?? "outcome-1",
    type: overrides.type ?? ("DETECTION" as OutcomeType),
    status: overrides.status ?? ("DETECTED" as OutcomeStatus),
    detectionTime:
      overrides.detectionTime ?? new Date("2024-01-01T10:30:00.000Z"),
    notes: overrides.notes ?? "Detected by EDR system",
    screenshotUrl:
      overrides.screenshotUrl ?? "/uploads/detection-screenshot.png",
    logData:
      overrides.logData ?? "Alert: Suspicious process execution detected",
    techniqueId: overrides.techniqueId ?? "technique-1",
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
    technique: overrides.technique ?? {
      id: "technique-1",
      operation: { id: 1, name: "Test Operation" },
      mitreTechnique: {
        id: "T1566",
        name: "Phishing",
        tactic: { id: "TA0001", name: "Initial Access" },
      },
      mitreSubTechnique: {
        id: "T1566.001",
        name: "Spearphishing Attachment",
      },
    },
    tools: overrides.tools ?? [{ id: "tool-1", name: "CrowdStrike Falcon" }],
    logSources: overrides.logSources ?? [
      { id: "log-source-1", name: "Windows Event Log" },
    ],
  };
}
