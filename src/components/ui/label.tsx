import { forwardRef, type LabelHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required = false, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "block text-sm font-medium text-[var(--color-text-primary)] mb-1",
          className,
        )}
        {...props}
      >
        {children}
        {required && (
          <span className="text-[var(--color-error)] ml-1">*</span>
        )}
      </label>
    );
  },
);
Label.displayName = "Label";

export { Label };