"use client";

import { ArrowUpDown, ArrowUp, ArrowDown, Filter } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type Props = {
  filterKey?: string;
  filterValue?: string;
  sortKey?: string;
  className?: string;
};

export default function FilterSortActions({
  filterKey,
  filterValue,
  sortKey = "sort",
  className = "",
}: Props) {
  const t = useTranslations("actions");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentSort = searchParams.get(sortKey);
  const isSortActive = Boolean(currentSort);

  const updateParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (params.get(key) === value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleFilterClick = () => {
    if (!filterKey || !filterValue) return;
    updateParams(filterKey, filterValue);
  };

  const handleSortClick = () => {
    const nextSort = currentSort === "asc" ? "desc" : "asc";

    const params = new URLSearchParams(searchParams.toString());
    params.set(sortKey, nextSort);
    params.set("page", "1");

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      {filterKey && filterValue && (
        <button
          type="button"
          onClick={handleFilterClick}
          className="inline-flex justify-center items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs h-9 w-9 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-purple-700 dark:hover:text-purple-400 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
          title={t("filter")}
          aria-label={t("filter")}
        >
          <Filter className="w-4 h-4" />
        </button>
      )}

      <button
        type="button"
        onClick={handleSortClick}
        className={cn(
          "inline-flex justify-center items-center rounded-xl border shadow-2xs h-9 w-9 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600",
          isSortActive
            ? "bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800 font-bold"
            : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-purple-700 dark:hover:text-purple-400",
        )}
        title={t("sort")}
        aria-label={t("sort")}
      >
        {currentSort === "asc" ? (
          <ArrowUp className="w-4 h-4 text-purple-700 dark:text-purple-300" />
        ) : currentSort === "desc" ? (
          <ArrowDown className="w-4 h-4 text-purple-700 dark:text-purple-300" />
        ) : (
          <ArrowUpDown className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}
