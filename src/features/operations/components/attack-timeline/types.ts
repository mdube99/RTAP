import type { OutcomeStatus, OutcomeType } from "@prisma/client";
import type { RouterOutputs } from "@/trpc/react";

export type Operation = RouterOutputs["operations"]["getById"];
export type Technique = Operation["techniques"][number];

export interface TechniqueTimelineDatum {
  techniqueId: string;
  label: string;
  techniqueName: string;
  tacticName: string | null;
  startDate: string;
  endDate: string | null;
  startTimestamp: number;
  endTimestamp: number | null;
  executedSuccessfully: boolean | null | undefined;
  outcomes: Technique["outcomes"];
  offset: number;
  duration: number;
  tooltipType: "technique";
}

export interface OutcomeTimelinePoint {
  techniqueId: string;
  label: string;
  tacticName: string | null;
  type: OutcomeType;
  status: OutcomeStatus;
  timestamp: number;
  detectionTime: string | null;
  usedFallbackTimestamp: boolean;
  tooltipType: "outcome";
  x: number;
  y: string;
}

export type TechniqueScatterPoint = TechniqueTimelineDatum & { x: number; y: string };
