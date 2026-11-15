import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "destructive"
    | "info"
    | "outline";
  size?: "sm" | "md";
  dot?: boolean;
}

const variantStyles: Record<NonNullable<BadgeProps["variant"]>, string> = {
  primary:
    "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800",
  secondary:
    "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  success:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800",
  warning:
    "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/70 dark:text-amber-300 dark:border-amber-800",
  destructive:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-800",
  info: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/70 dark:text-sky-300 dark:border-sky-800",
  outline:
    "bg-transparent text-slate-700 border-slate-300 dark:text-slate-300 dark:border-slate-700",
};

const dotColors: Record<NonNullable<BadgeProps["variant"]>, string> = {
  primary: "bg-purple-600 dark:bg-purple-400",
  secondary: "bg-slate-500 dark:bg-slate-400",
  success: "bg-emerald-600 dark:bg-emerald-400",
  warning: "bg-amber-500 dark:bg-amber-400",
  destructive: "bg-rose-600 dark:bg-rose-400",
  info: "bg-sky-600 dark:bg-sky-400",
  outline: "bg-slate-400",
};

const sizeStyles = {
  sm: "px-2 py-0.5 text-[11px] gap-1",
  md: "px-2.5 py-1 text-xs gap-1.5",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      dot = false,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center shrink-0 whitespace-nowrap border rounded-full font-semibold leading-normal transition-colors select-none",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              "rounded-full w-1.5 h-1.5 shrink-0",
              dotColors[variant],
            )}
            aria-hidden="true"
          />
        )}
        <span className="inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap">
          {children}
        </span>
      </span>
    );
  },
);

Badge.displayName = "Badge";
