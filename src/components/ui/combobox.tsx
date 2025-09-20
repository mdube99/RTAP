/**
 * Searchable combobox component with keyboard navigation
 * Built on top of our existing Select component styling
 */

"use client";

import * as React from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface ComboboxProps {
  value?: string;
  onValueChange?: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  clearable?: boolean;
}

export function Combobox({
  value,
  onValueChange,
  options,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyText = "No options found",
  disabled = false,
  className,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);

  const filteredOptions = React.useMemo(() => {
    if (!search) return options;
    const searchLower = search.toLowerCase();
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(searchLower) ||
        option.value.toLowerCase().includes(searchLower) ||
        option.description?.toLowerCase().includes(searchLower)
    );
  }, [options, search]);

  const selectedOption = options.find((option) => option.value === value);

  const handleSelect = (optionValue: string) => {
    onValueChange?.(optionValue);
    setOpen(false);
    setSearch("");
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
        handleSelect(filteredOptions[highlightedIndex]!.value);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1
      );
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  React.useEffect(() => {
    if (open) {
      setHighlightedIndex(-1);
    }
  }, [open, search]);

  return (
    <div className={cn("relative", className)}>
      <div className="relative group">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-lg border px-3 py-2 text-sm",
            "border-[var(--color-border)] bg-[var(--color-surface)]",
            "text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]/20",
            "focus-visible:border-[var(--ring)]",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "hover:border-[var(--ring)]/50 transition-colors"
          )}
        >
          <span className={selectedOption ? "" : "text-[var(--color-text-muted)]"}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
        {/** End-adornment clear icon (appears on hover/focus) */}
        {Boolean(value) && !disabled && (
          <button
            type="button"
            aria-label="Clear selection"
            title="Clear"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onValueChange?.("");
              setOpen(false);
              setSearch("");
              setHighlightedIndex(-1);
            }}
            className="absolute right-8 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-[var(--color-surface)] text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-lg">
          <div className="flex items-center border-b border-[var(--color-border)] px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex h-10 w-full bg-transparent py-3 text-sm outline-none placeholder:text-[var(--color-text-muted)] disabled:cursor-not-allowed disabled:opacity-50"
              autoFocus
            />
          </div>
          
          <div className="max-h-60 overflow-auto p-1">
            {/** Optional clear item for keyboard users */}
            {Boolean(value) && !disabled && (
              <button
                type="button"
                onClick={() => handleSelect("")}
                className="relative mb-1 flex w-full cursor-pointer select-none items-center rounded-md px-2 py-2 text-sm outline-none transition-colors hover:bg-[var(--color-surface)] text-[var(--color-text-secondary)]"
              >
                <X className="h-4 w-4 mr-2 opacity-70" /> Clear selection
              </button>
            )}
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-[var(--color-text-muted)]">
                {emptyText}
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  disabled={option.disabled}
                  className={cn(
                    "relative flex w-full cursor-pointer select-none items-center rounded-md px-2 py-2 text-sm outline-none transition-colors",
                    "hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)]",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    highlightedIndex === index && "bg-[var(--color-surface)] text-[var(--color-text-primary)]",
                    value === option.value && "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                  )}
                >
                  <div className="flex-1 text-left">
                    <div className="font-medium">{option.label}</div>
                    {option.description && (
                      <div className="text-xs text-[var(--color-text-muted)] mt-1">
                        {option.description}
                      </div>
                    )}
                  </div>
                  {value === option.value && (
                    <Check className="h-4 w-4 text-[var(--color-accent)]" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
