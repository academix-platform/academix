import * as React from "react";
import EmptyState from "@/components/states/EmptyState";
import { cn } from "@/lib/utils";

const Table = ({
  columns,
  renderRow,
  data,
  emptyTitle,
  emptyDescription,
}: {
  columns: { header: string; accessor: string; className?: string }[];
  renderRow: (item: any) => React.ReactNode;
  data: any[];
  emptyTitle?: string;
  emptyDescription?: string;
}) => {
  if (data.length === 0) {
    return (
      <div className="flex justify-center items-center h-full min-h-[300px]">
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          className="py-0"
        />
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
      <table className="w-full text-start text-xs md:text-sm">
        <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold select-none">
          <tr>
            {columns.map((col) => (
              <th
                key={col.accessor}
                className={cn("p-4 text-start font-semibold text-slate-700 dark:text-slate-200", col.className)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {data.map((item) => renderRow(item))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
