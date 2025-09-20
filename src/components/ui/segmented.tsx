"use client";

import { Button } from "@/components/ui/button";

interface SegmentedOption<T extends string> {
  label: string;
  value: T;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  allowDeselect?: boolean;
  onDeselect?: () => void;
}

export function Segmented<T extends string>({ options, value, onChange, allowDeselect = false, onDeselect }: SegmentedProps<T>) {
  return (
    <div className="inline-flex rounded-md bg-[var(--color-surface)] border border-[var(--color-border)]">
      {options.map((opt, i) => {
        const selected = value === opt.value;
        return (
          <Button
            key={opt.value}
            variant="secondary"
            size="sm"
            className={`rounded-none ${i === 0 ? 'rounded-l-md' : ''} ${i === options.length - 1 ? 'rounded-r-md' : ''} ` +
              (selected
                ? 'bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)] border border-[var(--color-accent)]'
                : 'text-[var(--color-text-secondary)]')}
            onClick={() => {
              if (allowDeselect && selected) {
                onDeselect?.();
                return;
              }
              onChange(opt.value);
            }}
            data-export-include
          >
            {opt.label}
          </Button>
        );
      })}
    </div>
  );
}
