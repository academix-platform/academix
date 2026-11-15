"use client";

import Menu from "@/components/Menu";
import Navbar from "@/components/Navbar";
import type { AuthUser } from "@/lib/auth";
import { X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type DashboardShellProps = {
  authUser: AuthUser | null;
  schoolName: string | null;
  children: ReactNode;
};

const DashboardShell = ({
  authUser,
  schoolName,
  children,
}: DashboardShellProps) => {
  const t = useTranslations("common");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);

  const closeMenu = useCallback((restoreFocus = false) => {
    setIsMenuOpen(false);
    if (restoreFocus) {
      const trigger = document.getElementById("mobile-menu-trigger");
      trigger?.focus();
    }
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;

    // Lock body scroll while mobile drawer is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeMenu(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen, closeMenu]);

  return (
    <div className="flex bg-canvas h-screen overflow-hidden text-content-primary">
      {/* Mobile Drawer Backdrop */}
      {isMenuOpen && (
        <div
          role="presentation"
          aria-hidden="true"
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity"
          onClick={() => closeMenu(true)}
        />
      )}

      {/* Primary Sidebar (Light Neutral Surface with Clean Border) */}
      <aside
        id="mobile-sidebar-drawer"
        role={isMenuOpen ? "dialog" : undefined}
        aria-modal={isMenuOpen ? "true" : undefined}
        aria-label={t("brand")}
        className={`fixed inset-y-0 start-0 z-50 flex flex-col bg-surface border-e border-outline transition-all duration-300 lg:static lg:translate-x-0 ${
          isMenuCollapsed ? "lg:w-[72px]" : "lg:w-52 xl:w-56"
        } ${
          isMenuOpen
            ? "translate-x-0 w-64 shadow-2xl"
            : "-translate-x-full rtl:translate-x-full lg:translate-x-0 lg:rtl:translate-x-0 w-64"
        }`}
      >
        {/* Sidebar Brand Header */}
        <div
          className={`h-16 flex items-center px-4 border-b border-outline/70 shrink-0 ${
            isMenuCollapsed ? "lg:justify-center" : "justify-between"
          }`}
        >
          <Link
            href="/"
            onClick={() => closeMenu(false)}
            className="inline-flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandPurple-500 rounded-lg p-1"
          >
            <Image
              src="/logo-purple.png"
              alt="Academix logo"
              className="w-8 h-7 object-contain rotate-[-12deg]"
              width={32}
              height={28}
            />
            <span
              className={`font-bold text-content-primary text-lg tracking-tight ${
                isMenuCollapsed ? "lg:hidden" : "block"
              }`}
            >
              {t("brand")}
            </span>
          </Link>

          <button
            type="button"
            aria-label="Close menu"
            onClick={() => closeMenu(true)}
            className="lg:hidden p-1.5 rounded-lg text-content-muted hover:text-content-primary hover:bg-surface-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandPurple-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation Menu */}
        <div className="flex-1 overflow-y-auto px-3 py-3 academix-menu-scroll">
          <Menu
            authUser={authUser}
            collapsed={isMenuCollapsed}
            onNavigate={() => closeMenu(false)}
          />
        </div>
      </aside>

      {/* Main Content Column */}
      <div
        className="flex flex-col flex-1 bg-canvas min-w-0 overflow-hidden"
        aria-hidden={isMenuOpen ? "true" : undefined}
      >
        <Navbar
          authUser={authUser}
          schoolName={schoolName}
          isMenuCollapsed={isMenuCollapsed}
          isMobileMenuOpen={isMenuOpen}
          onMenuClick={() => setIsMenuOpen(true)}
          onMenuCollapseToggle={() => setIsMenuCollapsed((value) => !value)}
        />
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardShell;
