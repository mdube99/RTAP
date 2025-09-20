import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-white/10 text-[var(--color-text-primary)]",
        secondary: "border-transparent bg-[var(--color-surface-elevated)] text-[var(--color-text-secondary)]",
        outline: "border-[var(--color-border)] text-[var(--color-text-secondary)]",
        glass: "glass text-[var(--color-text-primary)]",
        success: "border-transparent bg-[var(--status-success-bg)] text-[var(--status-success-fg)]",
        warning: "border-transparent bg-[var(--status-warn-bg)] text-[var(--status-warn-fg)]",
        error: "border-transparent bg-[var(--status-error-bg)] text-[var(--status-error-fg)]",
        info: "border-transparent bg-[var(--status-info-bg)] text-[var(--status-info-fg)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
