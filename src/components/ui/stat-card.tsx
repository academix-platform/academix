import * as React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  trend?: {
    value: string | number;
    positive?: boolean;
    label?: string;
  };
  variant?: "default" | "purple" | "subtle";
}

const variantStyles = {
  default:
    "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100",
  purple:
    "bg-gradient-to-br from-[#24104f] via-purple-900 to-purple-800 border-purple-800 text-white shadow-purple",
  subtle:
    "bg-purple-50/60 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800/60 text-slate-900 dark:text-slate-100",
};

export const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  (
    {
      className,
      title,
      value,
      icon,
      badge,
      trend,
      variant = "default",
      ...props
    },
    ref,
  ) => {
    const isPurple = variant === "purple";

    return (
      <div
        ref={ref}
        className={cn(
          "space-y-4 shadow-xs hover:shadow-md p-5 md:p-6 border rounded-2xl transition-all",
          variantStyles[variant],
          className,
        )}
        {...props}
      >
        <div className="flex justify-between items-center gap-2">
          {badge ? (
            <div>{badge}</div>
          ) : (
            <span
              className={cn(
                "font-semibold text-xs uppercase tracking-wider",
                isPurple
                  ? "text-purple-200"
                  : "text-slate-500 dark:text-slate-400",
              )}
            >
              {title}
            </span>
          )}
          {icon && (
            <div
              className={cn(
                "flex justify-center items-center p-2.5 rounded-xl shrink-0",
                isPurple
                  ? "bg-white/10 text-purple-200"
                  : "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/50",
              )}
            >
              {icon}
            </div>
          )}
        </div>

        <div className="space-y-1">
          {badge && (
            <p
              className={cn(
                "font-medium text-xs",
                isPurple
                  ? "text-purple-200"
                  : "text-slate-500 dark:text-slate-400",
              )}
            >
              {title}
            </p>
          )}
          <div
            className={cn(
              "font-bold tabular-nums text-3xl tracking-tight",
              isPurple ? "text-white" : "text-slate-900 dark:text-slate-100",
            )}
          >
            {value}
          </div>
        </div>

        {trend && (
          <div className="flex items-center gap-1.5 pt-1 border-black/5 dark:border-white/5 border-t text-xs">
            {trend.positive ? (
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            )}
            <span
              className={cn(
                "font-semibold",
                trend.positive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400",
              )}
            >
              {trend.value}
            </span>
            {trend.label && (
              <span
                className={
                  isPurple
                    ? "text-purple-300"
                    : "text-slate-500 dark:text-slate-400"
                }
              >
                {trend.label}
              </span>
            )}
          </div>
        )}
      </div>
    );
  },
);

StatCard.displayName = "StatCard";
