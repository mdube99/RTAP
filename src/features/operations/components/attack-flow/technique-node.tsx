"use client";

import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Eye, Shield, UserCheck, X } from "lucide-react";
import { Handle, Position } from "reactflow";
import type { RouterOutputs } from "@/trpc/react";
import { formatDateTime } from "@lib/formatDate";

type Operation = RouterOutputs["operations"]["getById"];
type Technique = Operation["techniques"][0] & {
  executedSuccessfully: boolean | null;
};

export default function TechniqueNode({
  data,
}: {
  data: { technique: Technique };
}) {
  const { technique } = data;
  const isCompleted = technique.endTime !== null;
  const isInProgress =
    technique.startTime !== null && technique.endTime === null;
  const executionSuccess = technique.executedSuccessfully;
  const detectionRate = technique.outcomes.some(
    (o) => o.type === "DETECTION" && o.status === "DETECTED",
  )
    ? 100
    : 0;
  const preventionRate = technique.outcomes.some(
    (o) => o.type === "PREVENTION" && o.status === "PREVENTED",
  )
    ? 100
    : 0;
  const attributionRate = technique.outcomes.some(
    (o) => o.type === "ATTRIBUTION" && o.status === "ATTRIBUTED",
  )
    ? 100
    : 0;

  const getCardClassName = (): string => {
    const baseClasses =
      "w-60 transition-all duration-200 hover:scale-105 hover:shadow-lg cursor-grab active:cursor-grabbing";
    if (isCompleted)
      return `${baseClasses} border-2 border-[var(--color-accent)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] hover:border-[var(--color-accent)] hover:shadow-[0_0_20px_rgba(var(--color-accent-rgb),0.3)]`;
    if (isInProgress)
      return `${baseClasses} border-2 border-[var(--status-warn-fg)] bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] hover:border-[var(--status-warn-fg)]`;
    return `${baseClasses} border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-surface-elevated)]`;
  };

  const startText = formatDateTime(technique.startTime);
  const endText = formatDateTime(technique.endTime);

  return (
    <div className="group relative">
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!h-3 !w-3 !border !border-[var(--color-surface-elevated)] !bg-[var(--color-accent)] opacity-0 transition-all duration-200 group-hover:opacity-100 hover:!h-4 hover:!w-4 hover:!bg-[var(--color-accent)]"
        style={{ left: -12, zIndex: 10, borderRadius: "2px" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!h-3 !w-3 !border !border-[var(--color-surface-elevated)] !bg-[var(--color-accent)] opacity-0 transition-all duration-200 group-hover:opacity-100 hover:!h-4 hover:!w-4 hover:!bg-[var(--color-accent)]"
        style={{ right: -12, zIndex: 10, borderRadius: "2px" }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!h-3 !w-3 !border !border-[var(--color-surface-elevated)] !bg-[var(--color-accent)] opacity-0 transition-all duration-200 group-hover:opacity-100 hover:!h-4 hover:!w-4 hover:!bg-[var(--color-accent)]"
        style={{ top: -12, zIndex: 10, borderRadius: "2px" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!h-3 !w-3 !border !border-[var(--color-surface-elevated)] !bg-[var(--color-accent)] opacity-0 transition-all duration-200 group-hover:opacity-100 hover:!h-4 hover:!w-4 hover:!bg-[var(--color-accent)]"
        style={{ bottom: -12, zIndex: 10, borderRadius: "2px" }}
      />

      <Card className={getCardClassName()}>
        <CardContent className="relative space-y-2 p-3">
          <div className="-mx-3 -mt-3 rounded-t-[var(--radius-md)] border-b border-[var(--color-border)] bg-[var(--color-surface)]/80 px-3 py-2">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-sm font-semibold break-words whitespace-normal text-[var(--color-text-primary)]">
                    {technique.mitreSubTechnique?.name ??
                      technique.mitreTechnique?.name ??
                      "Custom Technique"}
                  </span>
                  <span className="text-xs whitespace-nowrap text-[var(--color-text-secondary)]">
                    {technique.mitreSubTechnique?.id ??
                      technique.mitreTechnique?.id ??
                      "CUSTOM"}
                  </span>
                </div>
                {technique.mitreTechnique?.tactic?.name && (
                  <div className="flex items-center gap-2 truncate text-[10px] text-[var(--color-text-muted)]">
                    <span className="truncate">
                      {technique.mitreTechnique.tactic.name}
                    </span>
                    {technique.mitreTechnique.tactic.id && (
                      <span className="text-[10px] whitespace-nowrap text-[var(--color-text-secondary)]">
                        {technique.mitreTechnique.tactic.id}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {executionSuccess === true && (
                <CheckCircle className="mt-1 h-3 w-3 flex-shrink-0 text-[var(--status-success-fg)]" />
              )}
              {executionSuccess === false && (
                <X className="mt-1 h-3 w-3 flex-shrink-0 text-[var(--status-error-fg)]" />
              )}
            </div>
          </div>

          {technique.description && (
            <div className="line-clamp-3 text-xs leading-snug text-[var(--color-text-secondary)]">
              {technique.description}
            </div>
          )}

          {(startText ?? endText) && (
            <div className="mt-1 space-y-0.5 text-[10px] text-[var(--color-text-muted)]">
              {startText && <div>Start: {startText}</div>}
              {endText && <div>End: {endText}</div>}
            </div>
          )}

          {(isInProgress || isCompleted) && (
            <div className="absolute right-2 bottom-2 flex gap-1">
              {technique.outcomes.some((o) => o.type === "DETECTION") && (
                <Eye
                  className={`h-3 w-3 ${detectionRate > 0 ? "text-[var(--status-success-fg)]" : "text-[var(--status-error-fg)]"}`}
                />
              )}
              {technique.outcomes.some((o) => o.type === "PREVENTION") && (
                <Shield
                  className={`h-3 w-3 ${preventionRate > 0 ? "text-[var(--status-success-fg)]" : "text-[var(--status-error-fg)]"}`}
                />
              )}
              {technique.outcomes.some((o) => o.type === "ATTRIBUTION") && (
                <UserCheck
                  className={`h-3 w-3 ${attributionRate > 0 ? "text-[var(--status-success-fg)]" : "text-[var(--status-error-fg)]"}`}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
