"use client";

import {
  Menu,
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  School,
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
  isMobileMenuOpen?: boolean;
  onMenuClick?: () => void;
  onMenuCollapseToggle?: () => void;
};

const Navbar = ({
  authUser,
  schoolName,
  isMenuCollapsed = false,
  isMobileMenuOpen = false,
  onMenuClick,
  onMenuCollapseToggle,
}: NavbarProps) => {
  const locale = useLocale();
  const t = useTranslations("navbar");
  const roleT = useTranslations("roles");
  const { user, isLoaded } = useUser();
  const [messageCount, setMessageCount] = useState<number>(0);
  const [, setLoading] = useState(true);

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
  const imageUrl =
    authUser?.profileImageUrl || (isLoaded ? user?.imageUrl : undefined);

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
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-outline/80 bg-surface/90 px-3 sm:px-6 backdrop-blur-md">
      {/* START: Controls & Institutional Identity */}
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        {onMenuClick && (
          <button
            id="mobile-menu-trigger"
            type="button"
            aria-label={t("openMenu")}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-sidebar-drawer"
            aria-haspopup="dialog"
            onClick={onMenuClick}
            className="lg:hidden flex items-center justify-center w-9 h-9 rounded-xl border border-outline bg-surface text-content-secondary hover:text-content-primary hover:bg-surface-muted transition shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandPurple-500"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        {onMenuCollapseToggle && (
          <button
            type="button"
            aria-label={isMenuCollapsed ? t("expandMenu") : t("collapseMenu")}
            aria-expanded={!isMenuCollapsed}
            onClick={onMenuCollapseToggle}
            className="hidden lg:flex items-center justify-center w-9 h-9 rounded-xl border border-outline bg-surface text-content-secondary hover:text-content-primary hover:bg-surface-muted transition shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandPurple-500"
          >
            {isRtl ? (
              isMenuCollapsed ? (
                <PanelRightOpen className="w-4 h-4" />
              ) : (
                <PanelRightClose className="w-4 h-4" />
              )
            ) : isMenuCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Refined Institutional School Badge */}
        {schoolName && authUser?.role !== "superAdmin" && (
          <div className="flex items-center gap-2 rounded-xl border border-outline bg-surface px-3 py-1.5 shadow-2xs min-w-0">
            <School className="w-4 h-4 text-brandPurple-600 shrink-0" />
            <span className="truncate text-xs sm:text-sm font-semibold text-content-primary max-w-[140px] sm:max-w-[220px] md:max-w-[320px]">
              {schoolName}
            </span>
          </div>
        )}
      </div>

      {/* END: Actions & User Menu */}
      <div className="flex flex-shrink-0 items-center justify-end gap-2 sm:gap-3 lg:gap-4">
        <LanguageSwitcher variant="compact" />

        {canViewMessages && (
          <Link
            href="/list/messages"
            aria-label={t("messages")}
            className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-outline bg-surface text-content-secondary hover:text-content-primary hover:bg-surface-muted transition shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandPurple-500"
          >
            <MessageCircle className="w-4 h-4" />
            {messageCount > 0 && (
              <span className="absolute -top-1.5 -end-1.5 flex items-center justify-center bg-brandPurple-600 text-white rounded-full min-w-4 h-4 px-1 text-[10px] font-bold shadow-xs">
                {messageCount > 99 ? "99+" : messageCount}
              </span>
            )}
          </Link>
        )}

        {authUser?.role !== "superAdmin" && <NotificationBell />}

        {/* User Info (Desktop) */}
        <div className="hidden sm:flex flex-col text-end">
          <span className="font-semibold text-xs leading-4 text-content-primary">
            {fullName}
          </span>
          <span className="text-[11px] text-content-muted">
            {formattedRole}
          </span>
        </div>

        <UserAvatarMenu
          fullName={fullName}
          role={formattedRole}
          initials={initials}
          imageUrl={imageUrl}
          isAdmin={normalizedRole === "admin"}
        />
      </div>
    </header>
  );
};

export default Navbar;