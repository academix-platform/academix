import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  error?: boolean | string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, error, disabled, id, checked, defaultChecked, onChange, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const [isChecked, setIsChecked] = React.useState(defaultChecked ?? false);

    const controlled = checked !== undefined;
    const resolvedChecked = controlled ? checked : isChecked;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!controlled) {
        setIsChecked(e.target.checked);
      }
      onChange?.(e);
    };

    return (
      <div className={cn("inline-flex items-start gap-2.5", className)}>
        <div className="relative flex items-center pt-0.5">
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            checked={resolvedChecked}
            disabled={disabled}
            onChange={handleChange}
            className="peer sr-only"
            {...props}
          />
          <label
            htmlFor={inputId}
            className={cn(
              "w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 focus-visible:ring-offset-2",
              "peer-focus-visible:ring-2 peer-focus-visible:ring-purple-600 peer-focus-visible:ring-offset-2",
              resolvedChecked
                ? "bg-purple-600 border-purple-600 text-white"
                : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 hover:border-purple-400",
              disabled && "opacity-50 cursor-not-allowed",
              error && "border-rose-500"
            )}
          >
            {resolvedChecked && <Check className="w-3 h-3 stroke-[3]" />}
          </label>
        </div>

        {(label || description) && (
          <div className="flex flex-col text-sm select-none">
            {label && (
              <label
                htmlFor={inputId}
                className={cn(
                  "font-medium text-slate-800 dark:text-slate-200 cursor-pointer",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";
