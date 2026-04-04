"use client";

import Image from "next/image";
import { Search, MessageCircle, Bell } from "lucide-react";

const Navbar = () => {
  return (
    <div className="flex justify-between items-center p-4">
      <div className="hidden md:flex items-center gap-2 px-2 rounded-full ring-[1.5px] ring-gray-300 text-xs">
        <Search className="w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Search..."
          className="bg-transparent p-2 outline-none w-[200px]"
        />
      </div>

      <div className="flex justify-end items-center gap-6 w-full">
        <div className="flex justify-end items-center gap-2">
          <div className="flex justify-center items-center bg-white rounded-full w-7 h-7 cursor-pointer">
            <MessageCircle className="w-5 h-5 text-gray-600" />
          </div>

          <div className="relative flex justify-center items-center bg-white rounded-full w-7 h-7 cursor-pointer">
            <Bell className="w-5 h-5 text-gray-600" />
            <div className="-top-3 -right-3 absolute flex justify-center items-center bg-academixPurpleDark rounded-full w-5 h-5 text-white text-xs">
              1
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          <span className="font-medium text-xs leading-3">John Doe</span>
          <span className="text-[10px] text-gray-500 text-right">Admin</span>
        </div>

        <Image
          src="/avatar.png"
          alt=""
          width={36}
          height={36}
          className="rounded-full"
        />
      </div>
    </div>
  );
};

export default Navbar;
