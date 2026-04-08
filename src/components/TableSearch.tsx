"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

const TableSearch = () => {
  const router = useRouter();

  const handleSubmit = (e: React.FocusEvent<HTMLFormElement>) => {
    e.preventDefault();
    const value = (e.currentTarget[0] as HTMLInputElement).value;
    const params = new URLSearchParams(window.location.search);
    params.set("search", value);
    router.push(`${window.location.pathname}?${params}`);
  };
  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 px-2 rounded-full ring-[1.5px] ring-gray-300 w-full md:w-auto text-xs"
    >
      <Search className="w-4 h-4 text-gray-500" />
      <input
        type="text"
        placeholder="Search..."
        className="bg-transparent p-2 outline-none w-[200px]"
      />
    </form>
  );
};

export default TableSearch;
