"use client";

import { ArrowUpDown, Filter } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  filterKey?: string;
  filterValue?: string;
  sortKey?: string;
};

export default function FilterSortActions({
  filterKey,
  filterValue,
  sortKey = "sort",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
    const currentSort = searchParams.get(sortKey);
    const nextSort = currentSort === "asc" ? "desc" : "asc";

    const params = new URLSearchParams(searchParams.toString());
    params.set(sortKey, nextSort);
    params.set("page", "1");

    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      {filterKey && filterValue && (
        <button
          type="button"
          onClick={handleFilterClick}
          className="flex justify-center items-center bg-academixPurple hover:bg-academixPurpleDark rounded-md w-8 h-8 text-academixPurpleDark hover:text-academixPurple transition"
          title="Filter"
        >
          <Filter className="w-[14px] h-[14px]" />
        </button>
      )}

      <button
        type="button"
        onClick={handleSortClick}
        className="flex justify-center items-center bg-academixPurple hover:bg-academixPurpleDark rounded-md w-8 h-8 text-academixPurpleDark hover:text-academixPurple transition"
        title="Sort"
      >
        <ArrowUpDown className="w-[14px] h-[14px]" />
      </button>
    </div>
  );
}
