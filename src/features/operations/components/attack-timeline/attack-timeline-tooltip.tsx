import type { OutcomeStatus } from "@prisma/client";
import { OutcomeType } from "@prisma/client";
import type { TechniqueTimelineDatum } from "./types";

const tooltipStyle: React.CSSProperties = {
  backgroundColor: "var(--color-surface-elevated)",
  border: "1px solid var(--color-accent)",
  borderRadius: "var(--radius-md)",
  padding: "0.75rem",
  maxWidth: 320,
};

const outcomeTypeLabels: Record<OutcomeType, string> = {
  [OutcomeType.DETECTION]: "Detection",
  [OutcomeType.PREVENTION]: "Prevention",
  [OutcomeType.ATTRIBUTION]: "Attribution",
};

const formatStatus = (status: OutcomeStatus) =>
  status
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");

const formatDateTime = (value: string | number | Date) =>
  new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

interface TooltipPayloadItem {
  payload?: unknown;
}

interface AttackTimelineTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function hasTooltipType(value: unknown): value is { tooltipType?: unknown } {
  return typeof value === "object" && value !== null && "tooltipType" in value;
}

function isTechniquePayload(value: unknown): value is TechniqueTimelineDatum {
  return hasTooltipType(value) && value.tooltipType === "technique";
}

export function AttackTimelineTooltip(props: AttackTimelineTooltipProps) {
  const { active, payload } = props;
  if (!active || !Array.isArray(payload) || payload.length === 0) {
    return null;
  }

  const typedPayload = payload as unknown[];
  const first = typedPayload[0];
  if (!first || typeof first !== "object") {
    return null;
  }

  const raw = (first as { payload?: unknown }).payload;

  if (!raw) {
    return null;
  }

  if (isTechniquePayload(raw)) {
    const success =
      raw.executedSuccessfully === true
        ? "Successful"
        : raw.executedSuccessfully === false
          ? "Failed"
          : "Unknown";

    return (
      <div style={tooltipStyle}>
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">{raw.techniqueName}</p>
        {raw.tacticName && (
          <p className="text-xs text-[var(--color-text-muted)]">{raw.tacticName}</p>
        )}
        <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
          Start: {formatDateTime(raw.startDate)}
        </p>
        <p className="text-xs text-[var(--color-text-secondary)]">
          {raw.endDate ? `End: ${formatDateTime(raw.endDate)}` : "End: Ongoing"}
        </p>
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">Execution: {success}</p>
        {raw.outcomes.length > 0 && (
          <div className="mt-2 space-y-1">
            {raw.outcomes.map((outcome) => (
              <p key={`${outcome.type}-${outcome.id}`} className="text-xs text-[var(--color-text-secondary)]">
                {outcomeTypeLabels[outcome.type]}: {formatStatus(outcome.status)}
                {outcome.detectionTime
                  ? ` @ ${formatDateTime(outcome.detectionTime)}`
                  : ""}
              </p>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}
