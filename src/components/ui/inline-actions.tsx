"use client";

import { Button } from "@components/ui/button";
import { Pencil, Trash2 } from "lucide-react";

interface InlineActionsProps {
  onEdit?: () => void;
  onDelete?: () => void;
  deleteAriaLabel?: string;
  deleteDisabled?: boolean;
  deleteDisabledReason?: string;
}

export function InlineActions({ onEdit, onDelete, deleteAriaLabel = "Delete", deleteDisabled = false, deleteDisabledReason }: InlineActionsProps) {
  return (
    <div className="flex items-center gap-2">
      {onEdit && (
        <Button variant="ghost" size="sm" aria-label="Edit" onClick={onEdit}>
          <Pencil className="w-4 h-4" />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="sm"
          aria-label={deleteAriaLabel}
          onClick={deleteDisabled ? undefined : onDelete}
          disabled={deleteDisabled}
          title={deleteDisabled ? (deleteDisabledReason ?? "Cannot delete while in use") : undefined}
          className="text-[var(--status-error-fg)] hover:bg-[color:var(--status-error-bg)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

export default InlineActions;
