"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const TableSearch = () => {
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
      className="flex items-center gap-2 px-2 rounded-full ring-[1.5px] ring-gray-300 w-full md:w-auto text-xs"
    >
      <Search className="w-4 h-4 text-gray-500" />
      <input
        name="search"
        type="text"
        defaultValue={searchParams.get("search") ?? ""}
        placeholder="Search..."
        className="bg-transparent p-2 outline-none w-[200px]"
      />
    </form>
  );
};

export default TableSearch;
