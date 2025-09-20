import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "elevated" | "cyber" | "glass";
  glow?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", glow = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          "rounded-[var(--radius-lg)] transition-all duration-200",
          
          // Variant styles
          {
            "bg-[var(--color-surface)] border border-[var(--color-border)]": variant === "default",
            "bg-[var(--color-surface-elevated)] border border-[var(--color-border-light)] shadow-[var(--shadow-md)]": variant === "elevated",
            "bg-[var(--color-surface)] border border-[var(--color-border)] accent-border": variant === "cyber",
            // Modern glass variant (opt-in)
            "glass": variant === "glass",
          },
          
          // Glow effect
          {
            "glow-subtle": glow,
          },
          
          className,
        )}
        {...props}
      />
    );
  },
);
Card.displayName = "Card";

const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("p-[var(--space-lg)] pb-[var(--space-md)]", className)}
        {...props}
      />
    );
  },
);
CardHeader.displayName = "CardHeader";

const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn(
          "text-xl font-semibold text-[var(--color-text-primary)] leading-none tracking-tight",
          className,
        )}
        {...props}
      />
    );
  },
);
CardTitle.displayName = "CardTitle";

const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn("text-sm text-[var(--color-text-secondary)] mt-1.5", className)}
        {...props}
      />
    );
  },
);
CardDescription.displayName = "CardDescription";

const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("p-[var(--space-lg)] pt-0", className)}
        {...props}
      />
    );
  },
);
CardContent.displayName = "CardContent";

const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center p-[var(--space-lg)] pt-0", className)}
        {...props}
      />
    );
  },
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
