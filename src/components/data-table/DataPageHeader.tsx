import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type DataPageHeaderProps = {
  title: string;
  description?: string;
  count?: number;
  actions?: React.ReactNode;
  className?: string;
};

export function DataPageHeader({
  title,
  description,
  count,
  actions,
  className,
}: DataPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2.5">
          <h1 className="font-bold text-xl md:text-2xl text-slate-900 dark:text-slate-100 tracking-tight">
            {title}
          </h1>
          {typeof count === "number" && (
            <Badge
              variant="secondary"
              size="sm"
              className="font-medium text-slate-600 dark:text-slate-400"
            >
              {count}
            </Badge>
          )}
        </div>
        {description && (
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:self-auto self-start">
          {actions}
        </div>
      )}
    </div>
  );
}

export default DataPageHeader;
