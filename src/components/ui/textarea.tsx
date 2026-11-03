import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean | string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, disabled, id, ...props }, ref) => {
    const hasError = Boolean(error);

    return (
      <textarea
        ref={ref}
        id={id}
        disabled={disabled}
        aria-invalid={hasError ? "true" : undefined}
        className={cn(
          "bg-white dark:bg-slate-900 p-3 rounded-lg w-full min-h-[96px] text-slate-900 dark:text-slate-100 text-sm",
          "border transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 dark:focus-visible:ring-offset-slate-900",
          "disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:cursor-not-allowed",
          hasError
            ? "border-rose-400 dark:border-rose-600 focus-visible:ring-rose-500/30 focus-visible:border-rose-500"
            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 focus-visible:border-purple-600 focus-visible:ring-purple-600/20",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";
