import { customTooltipStyle } from "./custom-tooltip";
import { formatDate } from "@lib/formatDate";

type TimelinePayload = {
  name: string;
  startDate: string;
  endDate: string | null;
};

interface Props {
  active?: boolean;
  payload?: { payload?: TimelinePayload }[];
}

export function OperationTimelineTooltip({ active, payload }: Props) {
  if (!active || !payload?.length) {
    return null;
  }

  const details = payload[0]?.payload;

  if (!details) {
    return null;
  }

  return (
    <div style={customTooltipStyle}>
      <p className="text-[var(--color-text-primary)] font-semibold">{details.name}</p>
      <p className="text-sm text-[var(--color-text-muted)]">
        Start: {formatDate(details.startDate, { includeYear: true })}
      </p>
      <p className="text-sm text-[var(--color-text-muted)]">
        End: {details.endDate ? formatDate(details.endDate, { includeYear: true }) : "Ongoing"}
      </p>
    </div>
  );
}
