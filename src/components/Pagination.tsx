"use client";

import { ITEM_PER_PAGE } from "@/lib/settings";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const Pagination = ({ page, count }: { page: number; count: number }) => {
  const locale = useLocale();
  const router = useRouter();
  const isRtl = locale === "ar";
  const PrevIcon = isRtl ? ArrowRightIcon : ArrowLeftIcon;
  const NextIcon = isRtl ? ArrowLeftIcon : ArrowRightIcon;

  if (count === 0) {
    return null;
  }

  const hasPrev = ITEM_PER_PAGE * (page - 1) > 0;
  const hasNext = ITEM_PER_PAGE * (page - 1) + ITEM_PER_PAGE < count;

  const changePage = (newPage: number) => {
    const params = new URLSearchParams(window.location.search);
    params.set("page", newPage.toString());
    router.push(`${window.location.pathname}?${params}`);
  };

  return (
    <div className="flex justify-end items-center gap-1.5 ms-auto p-4 text-slate-600 dark:text-slate-300">
      <button
        type="button"
        aria-label="Previous page"
        className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
        onClick={() => changePage(page - 1)}
        disabled={!hasPrev}
      >
        <PrevIcon className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-1 text-xs md:text-sm font-medium">
        {Array.from({ length: Math.ceil(count / ITEM_PER_PAGE) }, (_, i) => {
          const pageIndex = i + 1;
          const isCurrent = page === pageIndex;
          return (
            <button
              type="button"
              key={pageIndex}
              aria-label={`Page ${pageIndex}`}
              aria-current={isCurrent ? "page" : undefined}
              className={cn(
                "min-w-[32px] h-8 px-2.5 rounded-lg transition font-semibold tabular-nums text-xs md:text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600",
                isCurrent
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
              onClick={() => changePage(pageIndex)}
            >
              {pageIndex}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-label="Next page"
        className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
        onClick={() => changePage(page + 1)}
        disabled={!hasNext}
      >
        <NextIcon className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Pagination;
