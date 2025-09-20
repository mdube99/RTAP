"use client";
// PR2 move: features/operations/components

/**
 * OutcomesSection
 * Detection, Prevention, Attribution outcomes and related tool/log selections.
 */

import { DateTimePicker, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui";
import TaxonomySelector from "./taxonomy-selector";
import { Shield, Target } from "lucide-react";

export interface OutcomesSectionProps {
  executionRecorded: boolean;
  executionRequiredMessage?: string;
  // Detection
  detection: string; // "yes" | "no" | "N/A"
  detectionTime: string;
  onDetectionChange: (value: string) => void;
  onDetectionTimeChange: (value: string) => void;
  defensiveTools: Array<{ id: string; name: string; description?: string }>;
  selectedDetectionToolIds: string[];
  onDetectionToolIdsChange: (ids: string[]) => void;

  // Prevention
  prevention: string; // "yes" | "no" | "N/A"
  onPreventionChange: (value: string) => void;
  selectedPreventionToolIds: string[];
  onPreventionToolIdsChange: (ids: string[]) => void;

  // Attribution
  attribution: string; // "yes" | "no" | "N/A"
  attributionTime: string;
  onAttributionChange: (value: string) => void;
  onAttributionTimeChange: (value: string) => void;
  logSources: Array<{ id: string; name: string }>;
  selectedLogSourceIds: string[];
  onLogSourceIdsChange: (ids: string[]) => void;
}

export default function OutcomesSection(props: OutcomesSectionProps) {
  const {
    executionRecorded,
    executionRequiredMessage = "Record the technique's start time before logging defensive outcomes.",
    detection,
    detectionTime,
    onDetectionChange,
    onDetectionTimeChange,
    defensiveTools,
    selectedDetectionToolIds,
    onDetectionToolIdsChange,
    prevention,
    onPreventionChange,
    selectedPreventionToolIds,
    onPreventionToolIdsChange,
    attribution,
    attributionTime,
    onAttributionChange,
    onAttributionTimeChange,
    logSources,
    selectedLogSourceIds,
    onLogSourceIdsChange,
  } = props;

  const outcomesDisabled = !executionRecorded;

  return (
    <div className="grid gap-6">
      {outcomesDisabled && (
        <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)]/60 px-4 py-3 text-sm text-[var(--color-text-muted)]">
          {executionRequiredMessage}
        </div>
      )}
      {/* Detection */}
      <div
        className={`space-y-4 rounded-lg border border-[var(--color-border)] p-4 ${outcomesDisabled ? "opacity-60" : ""}`}
        aria-disabled={outcomesDisabled}
      >
        <h3 className="font-semibold flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Detection
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Was this technique detected?</Label>
            <Select value={detection} onValueChange={onDetectionChange} disabled={outcomesDisabled}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes - Detected</SelectItem>
                <SelectItem value="no">No - Not detected</SelectItem>
                <SelectItem value="N/A">N/A - Not applicable</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {detection === "yes" && executionRecorded && (
            <DateTimePicker
              label="Detection Time"
              value={detectionTime}
              onChange={onDetectionTimeChange}
              required
            />
          )}
        </div>
        {detection === "yes" && executionRecorded && (
          <TaxonomySelector
            variant="tools"
            items={defensiveTools}
            selectedIds={selectedDetectionToolIds}
            onSelectionChange={onDetectionToolIdsChange}
            label="Defensive tools that detected this"
            compactHeader
            searchable={false}
            multiple={true}
            disabled={outcomesDisabled}
          />
        )}
        {detection === "no" && executionRecorded && (
          <TaxonomySelector
            variant="tools"
            items={defensiveTools}
            selectedIds={selectedDetectionToolIds}
            onSelectionChange={onDetectionToolIdsChange}
            label="Defensive tools that should have detected this"
            compactHeader
            searchable={false}
            multiple={true}
            disabled={outcomesDisabled}
          />
        )}
      </div>

      {/* Prevention */}
      <div
        className={`space-y-4 rounded-lg border border-[var(--color-border)] p-4 ${outcomesDisabled ? "opacity-60" : ""}`}
        aria-disabled={outcomesDisabled}
      >
        <h3 className="font-semibold flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Prevention
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Was this technique prevented?</Label>
            <Select value={prevention} onValueChange={onPreventionChange} disabled={outcomesDisabled}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes - Prevented</SelectItem>
                <SelectItem value="no">No - Not prevented</SelectItem>
                <SelectItem value="N/A">N/A - Not applicable</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* No prevention time required */}
        </div>
        {prevention === "yes" && executionRecorded && (
          <TaxonomySelector
            variant="tools"
            items={defensiveTools}
            selectedIds={selectedPreventionToolIds}
            onSelectionChange={onPreventionToolIdsChange}
            label="Tools that prevented this"
            compactHeader
            searchable={false}
            multiple={true}
            disabled={outcomesDisabled}
          />
        )}
        {prevention === "no" && executionRecorded && (
          <TaxonomySelector
            variant="tools"
            items={defensiveTools}
            selectedIds={selectedPreventionToolIds}
            onSelectionChange={onPreventionToolIdsChange}
            label="Defensive tools that should have prevented this"
            compactHeader
            searchable={false}
            multiple={true}
            disabled={outcomesDisabled}
          />
        )}
      </div>

      {/* Attribution */}
      <div
        className={`space-y-4 rounded-lg border border-[var(--color-border)] p-4 ${outcomesDisabled ? "opacity-60" : ""}`}
        aria-disabled={outcomesDisabled}
      >
        <h3 className="font-semibold flex items-center gap-2">
          <Target className="w-4 h-4" />
          Attribution
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Was this technique properly attributed?</Label>
            <Select value={attribution} onValueChange={onAttributionChange} disabled={outcomesDisabled}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">Yes - Properly attributed</SelectItem>
                <SelectItem value="no">No - Not attributed</SelectItem>
                <SelectItem value="N/A">N/A - Not applicable</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {attribution === "yes" && executionRecorded && (
            <DateTimePicker
              label="Attribution Time"
              value={attributionTime}
              onChange={onAttributionTimeChange}
              required
            />
          )}
        </div>
        {attribution === "yes" && executionRecorded && (
          <TaxonomySelector
            variant="log-sources"
            items={logSources}
            selectedIds={selectedLogSourceIds}
            onSelectionChange={onLogSourceIdsChange}
            label="Log sources that enabled attribution"
            compactHeader
            searchable={false}
            multiple={true}
            disabled={outcomesDisabled}
          />
        )}
        {attribution === "no" && executionRecorded && (
          <TaxonomySelector
            variant="log-sources"
            items={logSources}
            selectedIds={selectedLogSourceIds}
            onSelectionChange={onLogSourceIdsChange}
            label="Log sources that should have enabled attribution"
            compactHeader
            searchable={false}
            multiple={true}
            disabled={outcomesDisabled}
          />
        )}
      </div>
    </div>
  );
}
