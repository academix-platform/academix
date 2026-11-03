"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const TableSearch = () => {
  const t = useTranslations("common");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const value = String(formData.get("search") ?? "").trim();
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }

    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs shadow-xs focus-within:border-purple-600 focus-within:ring-2 focus-within:ring-purple-600/20 transition-all"
    >
      <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
      <input
        name="search"
        type="text"
        defaultValue={searchParams.get("search") ?? ""}
        placeholder={t("search")}
        className="bg-transparent outline-none w-full md:w-[220px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs md:text-sm"
      />
    </form>
  );
};

export default TableSearch;
