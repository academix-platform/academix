"use client";

import { Search, MessageCircle, Bell } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import UserAvatarMenu from "./UserAvatarMenu";
import { AuthUser } from "@/lib/auth";
import Link from "next/link";

///////////////////////////////
import {
  getUnreadCount,
} from "@/lib/actions/notification";
///////////////////////////////

type NavbarProps = {
  authUser: AuthUser | null;
  schoolName: string | null;
};

const Navbar = ({ authUser, schoolName }: NavbarProps) => {
  const { user, isLoaded } = useUser();
  const [messageCount, setMessageCount] = useState<number>(0);

  ///////////////////////////////
  const [notificationCount, setNotificationCount] = useState<number>(0);
  ///////////////////////////////

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessageCount = async () => {
      try {
        const response = await fetch("/api/messages/count");
        if (response.ok) {
          const data = await response.json();
          setMessageCount(data.count);
        }
      } catch (error) {
        console.error("Failed to fetch message count:", error);
      } finally {
        setLoading(false);
      }
    };

    ///////////////////////////////
    const fetchNotifications = async () => {
      try {
        if (!authUser?.id) return;

        const count = await getUnreadCount(authUser.id);
        setNotificationCount(count);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      }
    };
    ///////////////////////////////

    if (authUser) {
      fetchMessageCount();
      ///////////////////////////////
      fetchNotifications();
      ///////////////////////////////
    }
  }, [authUser]);

  const fallbackName = "User";
  const fallbackRole = authUser?.role ?? null;

  const fullName =
    (isLoaded && user?.fullName) ||
    (isLoaded &&
      [user?.firstName, user?.lastName].filter(Boolean).join(" ")) ||
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
          <span className="ml-2 font-bold text-academixPurpleDark text-lg uppercase whitespace-nowrap">
            {schoolName}
          </span>
        )}
      </div>

      {/* RIGHT */}
      <div className="flex justify-end items-center gap-6 w-full">
        <div className="flex items-center gap-3">
          {role !== "admin" && (
            <Link
              href="/list/messages"
              aria-label="Messages"
              className="relative w-7 h-7"
            >
              <MessageCircle className="w-5 h-5 hover:font-bold text-gray-600 hover:scale-[1.05] transition" />
              {messageCount > 0 && (
                <div className="-top-2.5 -right-1.5 absolute flex justify-center items-center bg-academixPurpleDark rounded-full w-5 h-5 text-white text-xs">
                  {messageCount > 99 ? "99+" : messageCount}
                </div>
              )}
            </Link>
          )}

          {/* /////////////////////////////// */}
          <Link
            href="/list/notifications"
            aria-label="Notifications"
            className="relative w-7 h-7"
          >
            <Bell className="w-5 h-5 hover:font-bold text-gray-600 hover:scale-[1.05] transition" />
            {notificationCount > 0 && (
              <div className="-top-2.5 -right-1.5 absolute flex justify-center items-center bg-academixPurpleDark rounded-full w-5 h-5 text-white text-xs">
                {notificationCount > 99 ? "99+" : notificationCount}
              </div>
            )}
          </Link>
          {/* /////////////////////////////// */}
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
