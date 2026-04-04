import { Search } from "lucide-react";
import Image from "next/image";

const TableSearch = () => {
  return (
    <div className="flex items-center gap-2 px-2 rounded-full ring-[1.5px] ring-gray-300 w-full md:w-auto text-xs">
      <Search className="w-4 h-4 text-gray-500" />
      <input
        type="text"
        placeholder="Search..."
        className="bg-transparent p-2 outline-none w-[200px]"
      />
    </div>
  );
};

export default TableSearch;
