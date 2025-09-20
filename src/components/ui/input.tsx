import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: "default" | "cyber" | "glass" | "elevated";
  error?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", variant = "default", error = false, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          // Base styles
          "flex w-full px-3 py-2 text-sm transition-colors",
          "placeholder:text-[var(--color-text-muted)]",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--color-surface)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          
          // Variant styles
          {
            // Default variant
            "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] focus:border-[var(--ring)] focus:ring-[var(--ring)]": variant === "default",
            // Elevated variant
            "bg-[var(--color-surface-elevated)] border border-[var(--color-border-light)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] focus:border-[var(--ring)] focus:ring-[var(--ring)]": variant === "elevated",
            
            // Cyber variant with accent border
            "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] text-[var(--color-text-primary)] accent-border focus:ring-[var(--ring)]": variant === "cyber",

            // Glass variant
            "glass rounded-[var(--radius-md)] text-[var(--color-text-primary)] focus:ring-[var(--ring)]": variant === "glass",
          },
          
          // Error state
          {
            "border-[var(--color-error)] focus:border-[var(--color-error)] focus:ring-[var(--color-error)]": error,
          },
          
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
