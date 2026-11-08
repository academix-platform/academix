"use client";

import { ITEM_PER_PAGE } from "@/lib/settings";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

type PaginationProps = {
  page: number;
  count: number;
  pageSize?: number;
  className?: string;
};

type PageItem = number | "ellipsis-start" | "ellipsis-end";

export default function Pagination({
  page,
  count,
  pageSize = ITEM_PER_PAGE,
  className = "",
}: PaginationProps) {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const isRtl = locale === "ar";

  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const currentPage = Math.min(Math.max(1, Math.floor(page) || 1), totalPages);

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  const from = count === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, count);

  const pages: PageItem[] = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "ellipsis-end", totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [
        1,
        "ellipsis-start",
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [
      1,
      "ellipsis-start",
      currentPage - 1,
      currentPage,
      currentPage + 1,
      "ellipsis-end",
      totalPages,
    ];
  }, [totalPages, currentPage]);

  if (count === 0) {
    return null;
  }

  const changePage = (newPage: number) => {
    const clamped = Math.min(Math.max(1, newPage), totalPages);
    const params = new URLSearchParams(window.location.search);
    params.set("page", clamped.toString());
    router.push(`${window.location.pathname}?${params.toString()}`);
  };

  const FirstIcon = isRtl ? ChevronsRight : ChevronsLeft;
  const PrevIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;
  const LastIcon = isRtl ? ChevronsLeft : ChevronsRight;

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 w-full p-4 border-t border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300",
        className,
      )}
    >
      {/* Result Count Summary */}
      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium select-none">
        {t("showingResults", { from, to, count })}
      </p>

      {/* Pagination Controls */}
      <div className="flex items-center gap-1 select-none flex-wrap justify-center">
        {/* First Page Button */}
        <button
          type="button"
          aria-label={t("firstPage")}
          title={t("firstPage")}
          className="p-1.5 sm:p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
          onClick={() => changePage(1)}
          disabled={!hasPrev}
        >
          <FirstIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Previous Page Button */}
        <button
          type="button"
          aria-label={t("previousPage")}
          title={t("previousPage")}
          className="p-1.5 sm:p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
          onClick={() => changePage(currentPage - 1)}
          disabled={!hasPrev}
        >
          <PrevIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Sliding Page Numbers & Ellipses */}
        <div className="flex items-center gap-1 text-xs md:text-sm font-medium">
          {pages.map((item, index) => {
            if (item === "ellipsis-start" || item === "ellipsis-end") {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-1 text-slate-400 dark:text-slate-600 select-none text-xs"
                >
                  …
                </span>
              );
            }

            const pageIndex = item;
            const isCurrent = currentPage === pageIndex;

            return (
              <button
                type="button"
                key={pageIndex}
                aria-label={t("page", { page: pageIndex })}
                aria-current={isCurrent ? "page" : undefined}
                className={cn(
                  "min-w-[32px] h-8 px-2.5 rounded-lg transition font-semibold tabular-nums text-xs md:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600",
                  isCurrent
                    ? "bg-purple-600 text-white shadow-xs font-bold ring-2 ring-purple-600/20"
                    : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800",
                )}
                onClick={() => changePage(pageIndex)}
              >
                {pageIndex}
              </button>
            );
          })}
        </div>

        {/* Next Page Button */}
        <button
          type="button"
          aria-label={t("nextPage")}
          title={t("nextPage")}
          className="p-1.5 sm:p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
          onClick={() => changePage(currentPage + 1)}
          disabled={!hasNext}
        >
          <NextIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Last Page Button */}
        <button
          type="button"
          aria-label={t("lastPage")}
          title={t("lastPage")}
          className="p-1.5 sm:p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
          onClick={() => changePage(totalPages)}
          disabled={!hasNext}
        >
          <LastIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>
    </div>
  );
}
