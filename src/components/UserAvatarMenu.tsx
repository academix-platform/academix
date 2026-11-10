"use client";

import { useClerk } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { LogOut, Settings, User } from "lucide-react";

type UserAvatarMenuProps = {
  fullName: string;
  role: string;
  initials: string;
  imageUrl?: string;
  isAdmin?: boolean;
};

const UserAvatarMenu = ({
  fullName,
  role,
  initials,
  imageUrl,
  isAdmin = false,
}: UserAvatarMenuProps) => {
  const t = useTranslations("navbar.userMenu");
  const sidebarT = useTranslations("sidebar.items");
  const actionsT = useTranslations("actions");
  const { signOut } = useClerk();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const closeMenu = useCallback((restoreFocus = true) => {
    setIsMenuOpen(false);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;

    const onDocumentClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        closeMenu(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu(true);
      }
    };

    document.addEventListener("mousedown", onDocumentClick);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onDocumentClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isMenuOpen, closeMenu]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut({ redirectUrl: "/sign-in" });
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsMenuOpen((prev) => !prev)}
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
        aria-controls={isMenuOpen ? "user-avatar-menu-popover" : undefined}
        className="flex items-center justify-center rounded-xl border border-outline bg-surface w-9 h-9 overflow-hidden hover:border-brandPurple-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandPurple-500 shadow-2xs shrink-0"
        aria-label={t("open")}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={t("avatarAlt")}
            width={36}
            height={36}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="flex justify-center items-center bg-brandPurple-100/70 text-brandPurple-700 w-full h-full font-bold text-xs">
            {initials}
          </span>
        )}
      </button>

      {isMenuOpen && (
        <div
          id="user-avatar-menu-popover"
          role="menu"
          aria-orientation="vertical"
          className="end-0 z-50 absolute bg-surface shadow-xl mt-2 border border-outline rounded-2xl w-56 overflow-hidden p-1.5 animate-in fade-in-0 zoom-in-95 duration-150"
        >
          <div className="px-3 py-2.5 border-b border-outline/70">
            <p className="font-semibold text-content-primary text-sm truncate">{fullName}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-canvas-subtle border border-outline text-[11px] font-medium text-content-secondary">
              {role || t("noRole")}
            </span>
          </div>

          <div className="py-1" role="none">
            <Link
              href="/profile"
              role="menuitem"
              onClick={() => closeMenu(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-content-secondary hover:text-content-primary hover:bg-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandPurple-500"
            >
              <User className="w-4 h-4 text-content-muted" />
              <span>{sidebarT("profile")}</span>
            </Link>

            {isAdmin && (
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => closeMenu(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-content-secondary hover:text-content-primary hover:bg-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandPurple-500"
              >
                <Settings className="w-4 h-4 text-content-muted" />
                <span>{sidebarT("settings")}</span>
              </Link>
            )}
          </div>

          <div className="pt-1 border-t border-outline/70" role="none">
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="flex items-center gap-2.5 px-3 py-2 w-full rounded-xl text-xs sm:text-sm font-medium text-content-secondary hover:text-rose-600 hover:bg-rose-50/80 transition-colors disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <LogOut className="w-4 h-4 text-content-muted" />
              <span>
                {isSigningOut ? actionsT("signingOut") : actionsT("signOut")}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserAvatarMenu;
