/**
 * Date picker component for date-only inputs (no time)
 *
 * UTC Conversion Behavior:
 * - Users see and input dates in their local timezone
 * - Component automatically converts to UTC before calling onChange
 * - When displaying a UTC value, it's converted back to local for the input
 * - All dates are stored and processed in UTC in the database
 */

"use client";

import { useEffect, useState } from "react";
import { Input } from "./input";
import { Label } from "./label";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { localDateInputToUTC, utcToLocalDateInput } from "@/lib/utcDate";

interface DatePickerProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
}

export function DatePicker({
  label,
  value,
  onChange,
  className,
  placeholder = "Select date (your local date will be converted to UTC)",
  required = false,
}: DatePickerProps) {
  const [localInputValue, setLocalInputValue] = useState(() => {
    if (!value) return "";
    try {
      return utcToLocalDateInput(new Date(value));
    } catch {
      return "";
    }
  });

  useEffect(() => {
    if (!value) {
      setLocalInputValue("");
      return;
    }
    try {
      const utcDate = new Date(value);
      setLocalInputValue(utcToLocalDateInput(utcDate));
    } catch {
      setLocalInputValue("");
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLocalValue = e.target.value;
    setLocalInputValue(newLocalValue);

    if (!newLocalValue) {
      onChange("");
      return;
    }

    try {
      const utcDate = localDateInputToUTC(newLocalValue);
      onChange(utcDate.toISOString());
    } catch (error) {
      onChange("");
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={`date-${label}`} required={required}>
        {label}
      </Label>
      <div className="relative group">
        <Input
          id={`date-${label}`}
          type="date"
          value={localInputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          className="pr-8"
        />
        {localInputValue && (
          <button
            type="button"
            aria-label="Clear date"
            title="Clear"
            onClick={() => {
              setLocalInputValue("");
              onChange("");
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] opacity-0 group-hover:opacity-100 focus:opacity-100"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">
        All dates in UTC (your local date will be converted)
      </p>
    </div>
  );
}

interface DateRangePickerProps {
  startLabel?: string;
  endLabel?: string;
  startValue?: string;
  endValue?: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  className?: string;
}

export function DateRangePicker({
  startLabel = "Start Date",
  endLabel = "End Date",
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  className,
}: DateRangePickerProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", className)}>
      <DatePicker
        label={startLabel}
        value={startValue}
        onChange={onStartChange}
        placeholder="Select start date (your local date will be converted to UTC)"
      />
      <DatePicker
        label={endLabel}
        value={endValue}
        onChange={onEndChange}
        placeholder="Select end date (your local date will be converted to UTC)"
      />
    </div>
  );
}
