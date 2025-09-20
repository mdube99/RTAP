import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "ghost" | "danger" | "glass";
  size?: "sm" | "md" | "lg";
  glow?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", glow = false, type = "button", ...props }, ref) => {
    return (
      <button
        className={cn(
          // Base styles
          "inline-flex items-center justify-center font-medium transition-all duration-200",
          "focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--color-surface)]",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          
          // Size variants
          {
            "px-3 py-1.5 text-sm rounded-[var(--radius-sm)]": size === "sm",
            "px-4 py-2 text-base rounded-[var(--radius-md)]": size === "md",
            "px-6 py-3 text-lg rounded-[var(--radius-lg)]": size === "lg",
          },
          
          // Color variants
          {
            // Primary - accent
            "bg-[var(--color-accent)] text-[var(--color-surface)] hover:bg-[var(--color-accent-dim)] border border-[var(--color-accent)]": variant === "primary",
            
            // Secondary - Surface with border
            "bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-elevated)] border border-[var(--color-border)] hover:border-[var(--color-border-light)]": variant === "secondary",
            
            // Accent - muted accent
            "bg-[var(--color-accent)] text-[var(--color-surface)] hover:bg-[var(--color-accent-muted)] border border-[var(--color-accent)]": variant === "accent",
            
            // Ghost - Transparent with hover
            "bg-transparent text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text-primary)] border border-transparent hover:border-[var(--color-border)]": variant === "ghost",
            
            // Danger - Error red
            "bg-[var(--color-error)] text-white hover:bg-[var(--color-error)]/80 border border-[var(--color-error)]": variant === "danger",

            // Glass - modern minimal primary
            "glass text-[var(--color-text-primary)] ring-1 ring-[rgba(var(--border-rgb,255,255,255),0.10)] hover:ring-[rgba(var(--border-rgb,255,255,255),0.18)] focus:ring-[var(--ring)]": variant === "glass",
          },
          
          // Glow effects
          {
            "glow-accent": glow && variant === "primary",
            "glow-subtle": glow && variant === "accent",
            "glow-error": glow && variant === "danger",
          },
          
          className,
        )}
        ref={ref}
        type={type}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button };
