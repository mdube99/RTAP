"use client";

/**
 * OverviewSection
 * MITRE selection (tactic/technique/sub-technique) + curated description and link.
 * Also captures the user-provided execution description for this technique instance.
 */

import { Badge, Card, CardContent, Combobox, Label } from "@/components/ui";
import { ExternalLink } from "lucide-react";
import { getCuratedShortDescription } from "@/lib/mitreDescriptionUtils";
import type { SelectedTechnique } from "@/features/operations/techniqueEditor.types";

export interface OverviewSectionProps {
  tacticOptions: Array<{ value: string; label: string; description?: string }>;
  techniqueOptions: Array<{ value: string; label: string; description?: string }>;
  selectedTacticId: string;
  selectedTechniqueValue?: string;
  onTacticChange: (tacticId: string) => void;
  onTechniqueChange: (idOrSubId: string) => void;
  clearTactic: () => void;
  clearTechnique: () => void;
  selectedTechnique: SelectedTechnique | null;
  description: string;
  onDescriptionChange: (value: string) => void;
}

export function OverviewSection(props: OverviewSectionProps) {
  const {
    tacticOptions,
    techniqueOptions,
    selectedTacticId,
    selectedTechniqueValue,
    onTacticChange,
    onTechniqueChange,
    selectedTechnique,
    description,
    onDescriptionChange,
  } = props;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Select MITRE ATT&CK Technique</h3>

        {/* Searchable Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tactic-select">MITRE Tactic</Label>
            <Combobox
              value={selectedTacticId}
              onValueChange={onTacticChange}
              options={tacticOptions}
              placeholder="Search tactics..."
              searchPlaceholder="Search tactics by ID or name..."
              emptyText="No tactics found"
              clearable
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="technique-select">MITRE Technique</Label>
            <Combobox
              value={selectedTechniqueValue}
              onValueChange={onTechniqueChange}
              options={techniqueOptions}
              placeholder="Search techniques..."
              searchPlaceholder="Search techniques by ID or name..."
              emptyText="No techniques found"
              disabled={techniqueOptions.length === 0}
              clearable
            />
          </div>
        </div>

        {/* Selected Technique Card */}
        {selectedTechnique && (
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="info">{selectedTechnique.tactic.id}</Badge>
                <span className="text-[var(--color-text-secondary)]">{selectedTechnique.tactic.name}</span>
                <span className="text-[var(--color-text-muted)]">→</span>
                <Badge variant="secondary">{selectedTechnique.technique.id}</Badge>
                <span className="font-medium text-[var(--color-text-primary)]">
                  {selectedTechnique.technique.name}
                </span>
                {selectedTechnique.subTechnique && (
                  <>
                    <span className="text-[var(--color-text-muted)]">→</span>
                    <Badge variant="secondary">{selectedTechnique.subTechnique.id}</Badge>
                    <span className="text-[var(--color-text-secondary)]">
                      {selectedTechnique.subTechnique.name}
                    </span>
                  </>
                )}
              </div>
              <p className="text-sm text-[var(--color-text-muted)] mb-3">
                {getCuratedShortDescription(
                  selectedTechnique.subTechnique?.id ?? selectedTechnique.technique.id,
                  selectedTechnique.subTechnique?.name ?? selectedTechnique.technique.name,
                  selectedTechnique.subTechnique?.description ?? selectedTechnique.technique.description
                )}
              </p>
              {(selectedTechnique.technique.url ?? selectedTechnique.subTechnique?.url) && (
                <a
                  href={selectedTechnique.subTechnique?.url ?? selectedTechnique.technique.url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  View on MITRE ATT&CK
                </a>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">
          Technique Description
        </Label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Describe how this technique will be executed in this operation"
          className="w-full p-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] resize-y min-h-[100px]"
        />
        <p className="text-xs text-[var(--color-text-muted)]">
          Customize the description for this specific operation context
        </p>
      </div>
    </div>
  );
}

export default OverviewSection;
