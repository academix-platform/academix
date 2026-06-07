"use client";

import {
  Menu,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import NotificationBell from "./NotificationBell";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import UserAvatarMenu from "./UserAvatarMenu";
import { AuthUser } from "@/lib/auth";
import Link from "next/link";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLocale, useTranslations } from "next-intl";

type NavbarProps = {
  authUser: AuthUser | null;
  schoolName: string | null;
  isMenuCollapsed?: boolean;
  onMenuClick?: () => void;
  onMenuCollapseToggle?: () => void;
};

const Navbar = ({
  authUser,
  schoolName,
  isMenuCollapsed = false,
  onMenuClick,
  onMenuCollapseToggle,
}: NavbarProps) => {
  const locale = useLocale();
  const t = useTranslations("navbar");
  const roleT = useTranslations("roles");
  const { user, isLoaded } = useUser();
  const [messageCount, setMessageCount] = useState<number>(0);
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

    if (authUser) {
      fetchMessageCount();
    }
  }, [authUser]);

  const fallbackName = t("userFallback");
  const fallbackRole = authUser?.role ?? null;

  const fullName =
    (isLoaded && user?.fullName) ||
    (isLoaded && [user?.firstName, user?.lastName].filter(Boolean).join(" ")) ||
    authUser?.displayName ||
    fallbackName;
  const imageUrl = authUser?.profileImageUrl || (isLoaded ? user?.imageUrl : undefined);

  const role =
    (isLoaded &&
      ((user?.publicMetadata as { role?: string } | undefined)?.role ??
        null)) ||
    fallbackRole;

  const formattedRole = role ? roleT(role) : "";
  const normalizedRole = role?.toLowerCase().replace(/[\s_]/g, "");
  const canViewMessages =
    normalizedRole !== "admin" && normalizedRole !== "superadmin";
  const isRtl = locale === "ar";

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
      <div className="flex items-center gap-3 min-w-0">
        {onMenuClick && (
          <button
            type="button"
            aria-label={t("openMenu")}
            onClick={onMenuClick}
            className="lg:hidden flex flex-shrink-0 justify-center items-center bg-academixPurpleDark hover:bg-academixPurpleDark/80 shadow-sm border border-academixPurple/25 rounded-md w-10 h-10 text-white transition"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        {onMenuCollapseToggle && (
          <button
            type="button"
            aria-label={isMenuCollapsed ? t("expandMenu") : t("collapseMenu")}
            onClick={onMenuCollapseToggle}
            className="hidden lg:flex flex-shrink-0 justify-center items-center bg-academixPurpleDark hover:bg-academixPurpleDark/70 shadow-sm border border-academixPurple/25 rounded-md w-10 h-10 text-white transition"
          >
            {isRtl ? (
              isMenuCollapsed ? (
                <PanelRightOpen className="w-5 h-5" />
              ) : (
                <PanelRightClose className="w-5 h-5" />
              )
            ) : isMenuCollapsed ? (
              <PanelLeftOpen className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>
        )}
        <div className="flex items-center gap-4 bg-gradient-to-r from-academixYellow via-academixYellow/50 to-academixYellow/30 ms-2 px-4 py-3 rounded-md text-xs">
          {schoolName && (
            <span className="font-bold text-[16px] text-academixPurpleDeep uppercase whitespace-nowrap">
              {schoolName}
            </span>
          )}
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex justify-end items-center gap-6 w-full">
        <div className="flex items-center gap-3">
          <LanguageSwitcher />

          {canViewMessages && (
            <Link
              href="/list/messages"
              aria-label={t("messages")}
              className="relative w-7 h-7"
            >
              <MessageCircle className="w-5 h-5 hover:font-bold text-gray-600 hover:scale-[1.05] transition" />
              {messageCount > 0 && (
                <div className="-top-2.5 absolute flex justify-center items-center bg-academixPurpleDark rounded-full w-5 h-5 text-white text-xs -end-1.5">
                  {messageCount > 99 ? "99+" : messageCount}
                </div>
              )}
            </Link>
          )}

          <NotificationBell />
        </div>

        {/* USER INFO */}
        <div className="hidden sm:flex flex-col">
          <span className="font-medium text-xs leading-3">{fullName}</span>
          <span className="text-[10px] text-gray-500 text-end">
            {formattedRole}
          </span>
        </div>

        <UserAvatarMenu
          fullName={fullName}
          role={formattedRole}
          initials={initials}
          imageUrl={imageUrl}
        />
      </div>
    </div>
  );
};

export default Navbar;
