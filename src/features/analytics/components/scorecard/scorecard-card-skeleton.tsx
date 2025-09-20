"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ScorecardCardSkeletonProps {
  headerLines?: number;
  bodyLines?: number;
  className?: string;
}

export function ScorecardCardSkeleton({
  headerLines = 1,
  bodyLines = 4,
  className,
}: ScorecardCardSkeletonProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="space-y-2">
        {Array.from({ length: headerLines }).map((_, idx) => (
          <div
            key={`header-${idx}`}
            className="h-4 w-32 animate-pulse rounded bg-[var(--color-surface-muted)]"
          />
        ))}
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: bodyLines }).map((_, idx) => (
          <div
            key={`body-${idx}`}
            className="h-3 w-full animate-pulse rounded bg-[var(--color-surface-muted)]"
          />
        ))}
      </CardContent>
    </Card>
  );
}
