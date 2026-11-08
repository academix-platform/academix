"use client";

import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type TableSearchProps = {
  placeholder?: string;
  className?: string;
};

export default function TableSearch({ placeholder, className = "" }: TableSearchProps) {
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlSearch = searchParams.get("search") ?? "";
  const [query, setQuery] = useState(urlSearch);

  // Sync state if external search parameter changes (e.g. browser back/forward)
  useEffect(() => {
    setQuery(urlSearch);
  }, [urlSearch]);

  const commitSearch = useCallback(
    (newSearch: string) => {
      const trimmed = newSearch.trim();
      const currentParam = searchParams.get("search") ?? "";

      if (trimmed === currentParam) {
        return;
      }

      const params = new URLSearchParams(searchParams.toString());

      if (trimmed) {
        params.set("search", trimmed);
      } else {
        params.delete("search");
      }

      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams],
  );

  // Debounce search update (400ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      commitSearch(query);
    }, 400);

    return () => clearTimeout(timer);
  }, [query, commitSearch]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    commitSearch(query);
  };

  const handleClear = () => {
    setQuery("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("search");
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("relative flex items-center w-full sm:w-64 md:w-72", className)}
    >
      <Search className="absolute start-3 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none shrink-0" />
      <input
        name="search"
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder || t("search")}
        className="w-full ps-9 pe-8 py-2 text-xs md:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-900 dark:text-slate-100 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20"
      />
      {query && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute end-2.5 p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
          title={t("clearSearch")}
          aria-label={t("clearSearch")}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </form>
  );
}
