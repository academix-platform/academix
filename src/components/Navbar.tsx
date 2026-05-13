"use client";

import { Search, MessageCircle, Bell } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import UserAvatarMenu from "./UserAvatarMenu";
import { AuthUser } from "@/lib/auth";

type NavbarProps = {
  authUser: AuthUser | null;
  schoolName: string | null;
};

const Navbar = ({ authUser, schoolName }: NavbarProps) => {
  const { user, isLoaded } = useUser();

  const fallbackName = "User";
  const fallbackRole = authUser?.role ?? null;

  const fullName =
    (isLoaded && user?.fullName) ||
    (isLoaded && [user?.firstName, user?.lastName].filter(Boolean).join(" ")) ||
    fallbackName;

  const role =
    (isLoaded &&
      ((user?.publicMetadata as { role?: string } | undefined)?.role ??
        null)) ||
    fallbackRole;

  const formattedRole = role
    ? role.charAt(0).toUpperCase() + role.slice(1)
    : "";

  const initials =
    fullName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || "U";

  return (
    <div className="flex justify-between items-center p-4">
      {/* SEARCH */}
      <div className="flex items-center gap-4 text-xs">
        {schoolName && (
          <span className="ml-2 font-bold text-academixPurpleDark text-lg whitespace-nowrap">
            {schoolName}
          </span>
        )}
      </div>

      {/* RIGHT */}
      <div className="flex justify-end items-center gap-6 w-full">
        <div className="flex items-center gap-2">
          <button
            aria-label="Messages"
            className="flex justify-center items-center bg-white rounded-full w-7 h-7"
          >
            <MessageCircle className="w-5 h-5 text-gray-600" />
          </button>

          <button
            aria-label="Notifications"
            className="relative flex justify-center items-center bg-white rounded-full w-7 h-7"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            <div className="-top-3 -right-3 absolute flex justify-center items-center bg-academixPurpleDark rounded-full w-5 h-5 text-white text-xs">
              1
            </div>
          </button>
        </div>

        {/* USER INFO */}
        <div className="hidden sm:flex flex-col">
          <span className="font-medium text-xs leading-3">{fullName}</span>
          <span className="text-[10px] text-gray-500 text-right">
            {formattedRole}
          </span>
        </div>

        <UserAvatarMenu
          fullName={fullName}
          role={formattedRole}
          initials={initials}
          imageUrl={isLoaded ? user?.imageUrl : undefined}
        />
      </div>
    </div>
  );
};

export default Navbar;
