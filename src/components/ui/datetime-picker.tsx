/**
 * Date/Time picker component with "Now" button for technique timing
 */

"use client";

import { useEffect, useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

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
  placeholder,
  required = false,
}: DateTimePickerProps) {
  const [localValue, setLocalValue] = useState(value ?? "");

  // Keep internal state in sync with external value changes
  useEffect(() => {
    setLocalValue(value ?? "");
  }, [value]);

  // Format current date/time for datetime-local input
  const formatNow = () => {
    const now = new Date();
    // datetime-local expects YYYY-MM-DDTHH:MM format
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleNowClick = () => {
    const nowValue = formatNow();
    setLocalValue(nowValue);
    onChange(nowValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
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
            value={localValue}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="pr-14"
          />
          {localValue && (
            <button
              type="button"
              aria-label="Clear date"
              title="Clear"
              onClick={() => { setLocalValue(""); onChange(""); }}
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
        placeholder="Select start time"
      />
      <DateTimePicker
        label={endLabel}
        value={endValue}
        onChange={onEndChange}
        placeholder="Select end time"
      />
    </div>
  );
}
