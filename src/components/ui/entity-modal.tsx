"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card";
import { Button } from "@components/ui/button";
import type { ReactNode } from "react";

interface EntityModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  actions?: ReactNode; // footer actions (e.g., Cancel/Save)
  onClose?: () => void;
  maxWidthClass?: string; // e.g., "max-w-md", defaults to lg
}

export default function EntityModal({ open, title, children, actions, onClose, maxWidthClass = "max-w-lg" }: EntityModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <Card className={`w-full ${maxWidthClass} border border-[var(--color-border-light)] shadow-[var(--shadow-lg)]`}>
        <CardHeader className="border-b border-[var(--color-border)] pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-[var(--color-text-primary)]">{title}</CardTitle>
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">×</Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {children}
          </div>
          {actions && (
            <div className="flex gap-3 justify-end pt-4 mt-4 border-t border-[var(--color-border)]">
              {actions}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export { EntityModal };
