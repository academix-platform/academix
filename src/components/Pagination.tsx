"use client";

import { ITEM_PER_PAGE } from "@/lib/settings";
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { useRouter } from "next/navigation";

const Pagination = ({ page, count }: { page: number; count: number }) => {
  const router = useRouter();

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
    <div className="flex justify-end items-center gap-2 ml-auto p-4 text-gray-500">
      <button
        className="bg-academixPurple disabled:opacity-50 p-1.5 rounded-md font-semibold text-academixPurpleDark text-xs disabled:cursor-not-allowed"
        onClick={() => changePage(page - 1)}
        disabled={!hasPrev}
      >
        <ArrowLeftIcon className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-2 text-sm">
        {Array.from({ length: Math.ceil(count / ITEM_PER_PAGE) }, (_, i) => {
          const pageIndex = i + 1;
          return (
            <button
              key={pageIndex}
              className={`py-1.5 px-4 rounded-md ${
                page === pageIndex
                  ? "bg-academixPurpleDark text-white"
                  : "bg-academixPurple hover:bg-academixPurpleDark text-academixPurpleDark hover:text-academixPurple"
              }`}
              onClick={() => changePage(pageIndex)}
            >
              {pageIndex}
            </button>
          );
        })}
      </div>
      <button
        className="bg-academixPurple disabled:opacity-50 p-1.5 rounded-md font-semibold text-academixPurpleDark text-xs disabled:cursor-not-allowed"
        onClick={() => changePage(page + 1)}
        disabled={!hasNext}
      >
        <ArrowRightIcon className="w-5 h-5" />
      </button>
    </div>
  );
};

export default Pagination;
