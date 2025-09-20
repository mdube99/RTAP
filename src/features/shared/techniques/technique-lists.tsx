"use client";

import { Card, CardContent } from "@components/ui/card";
import { Badge } from "@components/ui/badge";
import { Button } from "@components/ui/button";
import { ExternalLink, X } from "lucide-react";
import { getCuratedShortDescription } from "@lib/mitreDescriptionUtils";

export type TechniqueItem = {
  id: string;
  name: string;
  description: string;
  tactic?: {
    id: string;
    name: string;
  } | null;
  url?: string | null;
};

interface TechniqueRowProps {
  item: TechniqueItem;
  rightSlot?: React.ReactNode; // checkbox or remove button
}

function TechniqueRow({ item, rightSlot }: TechniqueRowProps) {
  return (
    <Card className="bg-[var(--color-surface-elevated)]">
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {item.tactic && (
                <>
                  <Badge className="bg-[var(--color-accent)]/20 text-[var(--color-accent)]">
                    {item.tactic.id}
                  </Badge>
                  <span className="text-xs text-[var(--color-text-secondary)]">{item.tactic.name}</span>
                  <span className="text-[var(--color-text-muted)]">→</span>
                </>
              )}
              <Badge variant="secondary">{item.id}</Badge>
              <span className="font-medium text-sm text-[var(--color-text-primary)]">
                {item.name}
              </span>
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              {getCuratedShortDescription(item.id, item.name, item.description)}
            </p>
            {item.url && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[var(--color-accent)] hover:underline mt-1"
              >
                <ExternalLink className="w-3 h-3" />
                View on MITRE ATT&CK
              </a>
            )}
          </div>
          {rightSlot && <div className="ml-2 shrink-0">{rightSlot}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

interface SelectedTechniqueListProps {
  items: TechniqueItem[];
  onRemove: (id: string) => void;
  heightClass?: string;
}

export function SelectedTechniqueList({ items, onRemove, heightClass = "max-h-60" }: SelectedTechniqueListProps) {
  if (items.length === 0) {
    return (
      <div className="mt-4 text-center py-8 text-[var(--color-text-muted)] border border-dashed border-[var(--color-border)] rounded-lg">
        <p className="text-sm">No techniques selected</p>
        <p className="text-xs mt-1">Search and add techniques that this threat actor is known to use</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 overflow-y-auto ${heightClass}`}>
      {items.map((technique) => (
        <TechniqueRow
          key={technique.id}
          item={technique}
          rightSlot={(
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onRemove(technique.id)}
              className="text-[var(--color-error)] hover:text-[var(--color-error)] hover:bg-[var(--color-error)]/10"
              aria-label={`Remove ${technique.id}`}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        />
      ))}
    </div>
  );
}

interface SelectableTechniqueListProps {
  items: TechniqueItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectAll?: () => void;
  onClear?: () => void;
  heightClass?: string;
}

export function SelectableTechniqueList({ items, selectedIds, onToggle, onSelectAll, onClear, heightClass = "max-h-[420px]" }: SelectableTechniqueListProps) {
  return (
    <div className="space-y-2">
      {(onSelectAll ?? onClear) && (
        <div className="flex items-center gap-2">
          {onSelectAll && <Button variant="ghost" size="sm" onClick={onSelectAll}>Select all</Button>}
          {onClear && <Button variant="ghost" size="sm" onClick={onClear}>Clear</Button>}
        </div>
      )}
      <div className={`overflow-auto ${heightClass}`}>
        <div className="space-y-2">
          {items.map((technique) => (
            <TechniqueRow
              key={technique.id}
              item={technique}
              rightSlot={(
                <input
                  type="checkbox"
                  checked={selectedIds.includes(technique.id)}
                  onChange={() => onToggle(technique.id)}
                  className="mt-1 rounded-[var(--radius-sm)] border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--ring)] focus:ring-offset-0"
                  aria-label={`Toggle ${technique.id}`}
                />
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
