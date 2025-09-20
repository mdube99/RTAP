"use client";

import type { ReactNode } from "react";
import { Button } from "@components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmModal({
  open,
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  loading,
}: ConfirmModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md border border-[var(--color-border-light)] shadow-[var(--shadow-lg)]">
        <CardHeader>
          <CardTitle className="text-[var(--status-error-fg)]">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          {description && (
            <p className="text-sm mb-4" style={{ color: "var(--status-error-fg)" }}>
              {description}
            </p>
          )}
          {children}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={onCancel} disabled={loading}>
              {cancelLabel}
            </Button>
            <Button variant="danger" size="sm" onClick={onConfirm} disabled={loading}>
              {loading ? "Working…" : confirmLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ConfirmModal;
