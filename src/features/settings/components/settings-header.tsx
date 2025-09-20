"use client";
// PR2 move: features/settings/components

import { Button } from "@/components/ui/button";

interface SettingsHeaderProps {
  title: string;
  subtitle?: string;
  onNew?: () => void;
  newLabel?: string; // defaults to "+ New"
  newDisabled?: boolean;
  onImport?: () => void;
}

export function SettingsHeader({ title, subtitle, onNew, newLabel = "+ New", newDisabled = false, onImport }: SettingsHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h3>
        {subtitle && (
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{subtitle}</p>
        )}
      </div>
      <div className="flex gap-2">
        {onImport && (
          <Button variant="secondary" size="sm" onClick={onImport}>Import</Button>
        )}
        {onNew && (
          <Button variant="secondary" size="sm" onClick={onNew} disabled={newDisabled}>{newLabel}</Button>
        )}
      </div>
    </div>
  );
}

export default SettingsHeader;
