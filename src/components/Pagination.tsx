"use client";

import { ITEM_PER_PAGE } from "@/lib/settings";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";

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
    <div className="flex justify-end items-center gap-2 ms-auto p-4 text-gray-500">
      <button
        type="button"
        aria-label="Previous page"
        className="bg-academixPurple disabled:opacity-50 p-2 rounded-md font-semibold text-academixInk hover:bg-academixPurpleDark hover:text-white transition shadow-sm text-xs disabled:cursor-not-allowed"
        onClick={() => changePage(page - 1)}
        disabled={!hasPrev}
      >
        <PrevIcon className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-2 text-sm">
        {Array.from({ length: Math.ceil(count / ITEM_PER_PAGE) }, (_, i) => {
          const pageIndex = i + 1;
          const isCurrent = page === pageIndex;
          return (
            <button
              type="button"
              key={pageIndex}
              aria-label={`Page ${pageIndex}`}
              aria-current={isCurrent ? "page" : undefined}
              className={`py-1.5 px-4 rounded-md transition font-medium ${
                isCurrent
                  ? "bg-academixPurpleDark text-white shadow-sm"
                  : "bg-academixPurple hover:bg-academixPurpleDark text-academixInk hover:text-white"
              }`}
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
        className="bg-academixPurple disabled:opacity-50 p-2 rounded-md font-semibold text-academixInk hover:bg-academixPurpleDark hover:text-white transition shadow-sm text-xs disabled:cursor-not-allowed"
        onClick={() => changePage(page + 1)}
        disabled={!hasNext}
      >
        <NextIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Pagination;
