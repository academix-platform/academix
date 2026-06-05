"use client";

import Menu from "@/components/Menu";
import Navbar from "@/components/Navbar";
import type { AuthUser } from "@/lib/auth";
import { X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <div className="flex bg-academixPurpleLight h-screen overflow-hidden">
      {isMenuOpen && (
        <button
          type="button"
          aria-label="Close menu backdrop"
          className="lg:hidden z-40 fixed inset-0 bg-black/35"
          onClick={closeMenu}
        />
      )}

      <aside
        className={`academix-menu-scroll fixed inset-y-0 start-0 z-50 bg-academixPurpleLight p-4 w-64 overflow-auto transition-all duration-300 lg:static lg:translate-x-0 ${
          isMenuCollapsed ? "lg:w-[76px]" : "lg:w-[16%] xl:w-[14%]"
        } ${
          isMenuOpen
            ? "translate-x-0"
            : "-translate-x-full rtl:translate-x-full lg:translate-x-0 lg:rtl:translate-x-0"
        }`}
      >
        <div
          className={`flex relative items-center gap-3 ${
            isMenuCollapsed ? "lg:justify-center" : "justify-between"
          }`}
        >
          <Link
            href="/"
            onClick={closeMenu}
            className={`flex justify-center lg:justify-start items-center gap-1 ${
              isMenuCollapsed ? "mb-4" : ""
            }`}
          >
            <Image
              src="/logo-purple.png"
              alt="logo"
              className="w-[32px] h-[32px] rotate-[-15deg]"
              width={32}
              height={32}
              style={{ height: "auto" }}
            />
            <span
              className={`font-bold text-academixPurpleDark transition-opacity ${
                isMenuCollapsed ? "lg:hidden" : ""
              }`}
            >
              ACADEMIX
            </span>
          </Link>

          <button
            type="button"
            aria-label="Close menu"
            onClick={closeMenu}
            className="lg:hidden -top-1 end-0 absolute flex justify-center items-center hover:bg-academixPurple/35 rounded-md w-8 h-8 text-academixPurpleDark transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <Menu
          authUser={authUser}
          collapsed={isMenuCollapsed}
          onNavigate={closeMenu}
        />
      </aside>

      <div className="flex flex-col flex-1 bg-academixPurpleLight min-w-0">
        <Navbar
          authUser={authUser}
          schoolName={schoolName}
          isMenuCollapsed={isMenuCollapsed}
          onMenuClick={() => setIsMenuOpen(true)}
          onMenuCollapseToggle={() => setIsMenuCollapsed((value) => !value)}
        />
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
};

export default DashboardShell;
