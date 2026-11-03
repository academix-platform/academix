import * as React from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean | string;
  selectSize?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: "h-8 ps-2.5 pe-8 text-xs rounded-md",
  md: "h-10 ps-3.5 pe-9 text-sm rounded-lg",
  lg: "h-12 ps-4 pe-10 text-base rounded-lg",
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { className, error, selectSize = "md", disabled, children, id, ...props },
    ref,
  ) => {
    const hasError = Boolean(error);

    return (
      <div className="relative w-full">
        <select
          ref={ref}
          id={id}
          disabled={disabled}
          aria-invalid={hasError ? "true" : undefined}
          className={cn(
            "bg-white dark:bg-slate-900 w-full text-slate-900 dark:text-slate-100 appearance-none",
            "border transition-all cursor-pointer",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900",
            "disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:cursor-not-allowed",
            hasError
              ? "border-rose-400 dark:border-rose-600 focus-visible:ring-rose-500/30 focus-visible:border-rose-500"
              : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus-visible:border-purple-600 focus-visible:ring-purple-600/20",
            sizeStyles[selectSize],
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <div className="absolute inset-y-0 flex items-center pe-2.5 text-slate-400 dark:text-slate-500 pointer-events-none end-0">
          <ChevronDown className="w-4 h-4" aria-hidden="true" />
        </div>
      </div>
    );
  },
);

Select.displayName = "Select";
