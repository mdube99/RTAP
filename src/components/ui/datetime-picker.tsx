/**
 * Date/Time picker component with "Now" button for technique timing
 *
 * UTC Conversion Behavior:
 * - Users see and input dates in their local timezone
 * - Component automatically converts to UTC before calling onChange
 * - When displaying a UTC value, it's converted back to local for the input
 * - All times are stored and processed in UTC in the database
 */

"use client";

import { useEffect, useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { localInputToUTC, utcToLocalInput } from "@/lib/utcDate";

interface DateTimePickerProps {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
}

export function DateTimePicker({
  label,
  value,
  onChange,
  className,
  placeholder = "Select time (your local time will be converted to UTC)",
  required = false,
}: DateTimePickerProps) {
  const [localInputValue, setLocalInputValue] = useState(() => {
    if (!value) return "";
    try {
      return utcToLocalInput(new Date(value));
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
      setLocalInputValue(utcToLocalInput(utcDate));
    } catch {
      setLocalInputValue("");
    }
  }, [value]);

  const formatNow = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleNowClick = () => {
    const nowLocalString = formatNow();
    setLocalInputValue(nowLocalString);
    try {
      const utcDate = localInputToUTC(nowLocalString);
      onChange(utcDate.toISOString());
    } catch (error) {
      onChange("");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLocalValue = e.target.value;
    setLocalInputValue(newLocalValue);

    if (!newLocalValue) {
      onChange("");
      return;
    }

    try {
      const utcDate = localInputToUTC(newLocalValue);
      onChange(utcDate.toISOString());
    } catch (error) {
      onChange("");
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={`datetime-${label}`} required={required}>
        {label}
      </Label>
      <div className="flex gap-2">
        <div className="flex-1 relative group">
          <Input
            id={`datetime-${label}`}
            type="datetime-local"
            value={localInputValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="pr-14"
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
              className="absolute right-10 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] opacity-0 group-hover:opacity-100 focus:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleNowClick}
            className="flex items-center gap-1 whitespace-nowrap"
          >
            <Clock className="w-4 h-4" />
            Now
          </Button>
        </div>
      </div>
      <p className="text-xs text-[var(--color-text-muted)]">
        All times in UTC (your local time will be converted)
      </p>
    </div>
  );
}

interface TimeRangePickerProps {
  startLabel?: string;
  endLabel?: string;
  startValue?: string;
  endValue?: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  className?: string;
}

export function TimeRangePicker({
  startLabel = "Start Time",
  endLabel = "End Time",
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  className,
}: TimeRangePickerProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", className)}>
      <DateTimePicker
        label={startLabel}
        value={startValue}
        onChange={onStartChange}
        placeholder="Select start time (your local time will be converted to UTC)"
      />
      <DateTimePicker
        label={endLabel}
        value={endValue}
        onChange={onEndChange}
        placeholder="Select end time (your local time will be converted to UTC)"
      />
    </div>
  );
}
