"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DateTimePicker } from "@/components/ui/datetime-picker";
import { Filter } from "lucide-react";
import type { Tag } from "@prisma/client";
import type { Dispatch, SetStateAction } from "react";

export type TimeRange = "all" | "month" | "quarter" | "year" | "custom";

interface TimeRangeFilterProps {
  range: TimeRange;
  setRange: (p: TimeRange) => void;
  customStartDate: string;
  setCustomStartDate: (v: string) => void;
  customEndDate: string;
  setCustomEndDate: (v: string) => void;
  selectedTagIds: string[];
  setSelectedTagIds: Dispatch<SetStateAction<string[]>>;
  allTags?: Tag[];
}

export function TimeRangeFilter({
  range,
  setRange,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate,
  selectedTagIds,
  setSelectedTagIds,
  allTags,
}: TimeRangeFilterProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
          <Filter className="w-5 h-5 text-[var(--color-accent)]" />
          Filters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row lg:items-start lg:gap-8 gap-6">
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-sm text-[var(--color-text-muted)] whitespace-nowrap">Range:</span>
              {["all", "month", "quarter", "year", "custom"].map((p) => (
                <Button
                  key={p}
                  variant={range === p ? "primary" : "secondary"}
                  size="sm"
                  onClick={() => setRange(p as TimeRange)}
                >
                  {
                    p === "custom"
                      ? "Custom"
                      : p === "all"
                        ? "All Time"
                        : `Previous ${p.charAt(0).toUpperCase() + p.slice(1)}`
                  }
                </Button>
              ))}
            </div>
            {range === "custom" && (
              <div className="flex flex-wrap gap-4 items-start">
                <DateTimePicker
                  label="From"
                  value={customStartDate}
                  onChange={setCustomStartDate}
                  className="min-w-[240px]"
                />
                <DateTimePicker
                  label="To"
                  value={customEndDate}
                  onChange={setCustomEndDate}
                  className="min-w-[240px]"
                />
              </div>
            )}
          </div>
          {allTags && allTags.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-[var(--color-text-muted)] whitespace-nowrap">Tags:</span>
              {allTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant={selectedTagIds.includes(tag.id) ? "default" : "secondary"}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  style={
                    selectedTagIds.includes(tag.id)
                      ? {
                          borderColor: tag.color,
                          backgroundColor: `${tag.color}20`,
                          color: tag.color,
                        }
                      : {}
                  }
                  onClick={() =>
                    setSelectedTagIds((prev) =>
                      prev.includes(tag.id)
                        ? prev.filter((id) => id !== tag.id)
                        : [...prev, tag.id]
                    )
                  }
                >
                  {tag.name}
                </Badge>
              ))}
              {selectedTagIds.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTagIds([])}
                  className="text-xs px-2 py-1 h-auto ml-2"
                >
                  Clear All
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
