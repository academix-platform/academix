"use client";

import { Menu, X, ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";

const HomeNavbar = () => {
  const commonT = useTranslations("common");
  const t = useTranslations("home.nav");
  const [isOpen, setIsOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("hero");

  const navLinks = [
    { label: t("home"), href: "#hero", id: "hero" },
    { label: t("about"), href: "#about", id: "about" },
    { label: t("features"), href: "#features", id: "features" },
    { label: t("users"), href: "#roles", id: "roles" },
    { label: t("howItWorks"), href: "#how-it-works", id: "how-it-works" },
  ];

  const closeMenu = () => setIsOpen(false);

  // Dynamic Scrollspy: track active section based on scroll position
  useEffect(() => {
    const sectionIds = ["hero", "about", "features", "roles", "how-it-works"];

    const handleScroll = () => {
      const scrollPosition = window.scrollY + 140; // Navbar offset

      for (let i = sectionIds.length - 1; i >= 0; i--) {
        const el = document.getElementById(sectionIds[i]);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(sectionIds[i]);
          return;
        }
      }
      setActiveSection("hero");
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-outline bg-surface/90 backdrop-blur-md transition-colors shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          {/* Brand Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandPurple-500 rounded-lg p-1"
            aria-label="Academix Home"
          >
            <Image
              src="/logo-purple.png"
              alt="Academix logo"
              className="w-8 h-7 object-contain rotate-[-12deg]"
              width={32}
              height={28}
            />
            <span className="font-bold text-content-primary text-xl tracking-tight">
              {commonT("brand")}
            </span>
          </Link>

          {/* Desktop Navigation Links (Visible on lg: 1024px+) */}
          <nav
            aria-label="Public Navigation"
            className="hidden lg:flex items-center gap-1 xl:gap-2"
          >
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandPurple-500 ${
                    isActive
                      ? "text-brandPurple-700 bg-brandPurple-50/80 font-semibold shadow-2xs"
                      : "text-content-secondary hover:text-content-primary hover:bg-surface-muted"
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>

          {/* Desktop Actions (Visible on lg: 1024px+) */}
          <div className="hidden lg:flex items-center gap-3">
            <LanguageSwitcher variant="compact" />
            <Link
              href="/sign-in"
              className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-content-secondary hover:text-content-primary hover:bg-surface-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandPurple-500"
            >
              {t("signIn")}
            </Link>
            <Link href="/school-signup">
              <Button
                variant="primary"
                size="sm"
                className="font-semibold shadow-xs whitespace-nowrap"
                rightIcon={<ArrowRight className="w-3.5 h-3.5 rtl:rotate-180 shrink-0" />}
              >
                {t("signUp")}
              </Button>
            </Link>
          </div>

          {/* Tablet & Mobile Menu Trigger & Language (< 1024px) */}
          <div className="flex lg:hidden items-center gap-2">
            <LanguageSwitcher variant="compact" />
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              aria-expanded={isOpen}
              aria-label={isOpen ? t("closeMenu") : t("openMenu")}
              className="p-2 rounded-lg text-content-secondary hover:text-content-primary hover:bg-surface-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandPurple-500"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in-0 duration-200 lg:hidden"
          onClick={closeMenu}
          aria-hidden="true"
        />
      )}

      {/* Mobile Drawer Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mobile Navigation"
        className={`fixed top-0 end-0 z-50 h-full w-72 bg-surface border-s border-outline shadow-2xl p-6 flex flex-col justify-between transform transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? "translate-x-0" : "translate-x-full rtl:-translate-x-full"
        }`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-outline">
            <div className="flex items-center gap-2">
              <Image
                src="/logo-purple.png"
                alt="Academix logo"
                className="w-7 h-6 object-contain rotate-[-12deg]"
                width={28}
                height={24}
              />
              <span className="font-bold text-content-primary text-base">
                {commonT("brand")}
              </span>
            </div>
            <button
              type="button"
              onClick={closeMenu}
              aria-label={t("closeMenu")}
              className="p-1.5 rounded-lg text-content-secondary hover:text-content-primary hover:bg-surface-muted transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brandPurple-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => {
              const isActive = activeSection === link.id;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={closeMenu}
                  className={`px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "text-brandPurple-700 bg-brandPurple-50/80 font-semibold"
                      : "text-content-secondary hover:text-content-primary hover:bg-surface-muted"
                  }`}
                >
                  {link.label}
                </a>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="space-y-3 pt-6 border-t border-outline">
          <Link
            href="/sign-in"
            onClick={closeMenu}
            className="w-full flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold text-content-primary bg-surface-muted hover:bg-surface-muted/80 transition border border-outline"
          >
            {t("signIn")}
          </Link>
          <Link href="/school-signup" onClick={closeMenu}>
            <Button
              variant="primary"
              size="md"
              className="w-full font-semibold whitespace-nowrap"
              rightIcon={<ArrowRight className="w-4 h-4 rtl:rotate-180 shrink-0" />}
            >
              {t("signUp")}
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
};

export default HomeNavbar;
