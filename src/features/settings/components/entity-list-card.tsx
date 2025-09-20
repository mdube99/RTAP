"use client";
// PR2 move: features/settings/components

import { Card, CardContent } from "@/components/ui/card";
import type { ReactNode } from "react";

interface EntityListCardProps {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode; // chips / badges row under title
  actions?: ReactNode; // right-side actions
}

export default function EntityListCard({ title, description, meta, actions }: EntityListCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h4 className="font-medium text-[var(--color-text-primary)]">{title}</h4>
            </div>
            {typeof description !== 'undefined' && (
              <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">{description}</p>
            )}
            {meta && (
              <div className="mt-3">{meta}</div>
            )}
          </div>
          {actions && (
            <div className="ml-4">{actions}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
