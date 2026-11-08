import React from "react";
import { cn } from "@/lib/utils";

export type DataPageToolbarProps = {
  search?: React.ReactNode;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

export function DataPageToolbar({
  search,
  filters,
  actions,
  children,
  className,
}: DataPageToolbarProps) {
  if (children) {
    return (
      <div
        className={cn(
          "flex flex-col md:flex-row md:items-center md:justify-between gap-3",
          className,
        )}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center md:justify-between gap-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-2.5 flex-1">
        {search}
        {filters}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

export default DataPageToolbar;
