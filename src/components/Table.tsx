import * as React from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";

export type TableColumn = {
  header: string;
  accessor: string;
  className?: string;
};

type TableProps<T = any> = {
  columns: TableColumn[];
  renderRow: (item: T) => React.ReactNode;
  data: T[];
  emptyTitle?: string;
  emptyDescription?: string;
  minWidth?: string;
  className?: string;
};

export default function Table<T = any>({
  columns,
  renderRow,
  data,
  emptyTitle = "No data found",
  emptyDescription = "There are no records matching your criteria.",
  minWidth = "min-w-[680px]",
  className,
}: TableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex justify-center items-center w-full py-6">
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          className="w-full max-w-lg border-dashed bg-slate-50/40 dark:bg-slate-900/30"
        />
      </div>
    );
  }

  return (
    <div
      tabIndex={0}
      aria-label="Data Table scroll view"
      className={cn(
        "w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600/30",
        className,
      )}
    >
      <table className={cn("w-full text-start text-xs md:text-sm border-collapse", minWidth)}>
        <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-semibold select-none">
          <tr>
            {columns.map((col) => (
              <th
                key={col.accessor}
                className={cn(
                  "px-4 py-3 text-start font-bold text-slate-700 dark:text-slate-200 tracking-tight",
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900">
          {data.map((item) => renderRow(item))}
        </tbody>
      </table>
    </div>
  );
}
