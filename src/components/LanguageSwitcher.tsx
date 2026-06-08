"use client";

import { Check, ChevronDown, Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

const locales = ["en", "ar"] as const;

type LanguageSwitcherProps = {
  variant?: "default" | "compact";
};

const LanguageSwitcher = ({ variant = "default" }: LanguageSwitcherProps) => {
  const locale = useLocale();
  const t = useTranslations("navbar.language");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);

  const currentLocale = locales.includes(locale as (typeof locales)[number])
    ? (locale as (typeof locales)[number])
    : "en";

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleChange = (nextLocale: string) => {
    if (nextLocale === currentLocale) {
      setIsOpen(false);
      return;
    }

    const query = searchParams.toString();
    const href = query ? `${pathname}?${query}` : pathname;

    startTransition(() => {
      setIsOpen(false);
      document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
      router.replace(href);
      router.refresh();
    });
  };

  const toggleLocale = () => {
    handleChange(currentLocale === "en" ? "ar" : "en");
  };

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={toggleLocale}
        disabled={isPending}
        aria-label={t("label")}
        title={t(currentLocale === "en" ? "ar" : "en")}
        className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 disabled:opacity-60 shadow-sm backdrop-blur-sm px-2.5 border border-white/20 hover:border-white/35 rounded-md min-w-16 h-8 font-semibold text-white text-xs uppercase transition disabled:cursor-not-allowed"
      >
        <Languages className="w-3.5 h-3.5" aria-hidden="true" />
        <span className="w-5 text-center">
          {currentLocale === "ar" ? "EN" : "AR"}
        </span>
      </button>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        disabled={isPending}
        aria-label={t("label")}
        aria-expanded={isOpen}
        className="group flex items-center gap-2 bg-white/95 disabled:opacity-60 shadow-sm hover:shadow-md ps-2 pe-3 border border-academixPurple/20 hover:border-academixPurple/40 rounded-md ring-1 ring-white/70 h-10 text-gray-700 text-sm transition disabled:cursor-not-allowed"
      >
        <span className="flex justify-center items-center bg-academixPurpleLight rounded-full ring-1 ring-academixPurple/20 w-7 h-7">
          <Languages className="w-4 h-4 text-academixPurpleDark" />
        </span>
        <span className="hidden sm:flex flex-col items-start min-w-0 leading-none">
          <span className="mt-0.5 font-medium text-gray-600 text-xs">
            {t(currentLocale)}
          </span>
        </span>
        <span className="bg-academixPurpleDark px-1.5 py-0.5 rounded-md font-bold text-[10px] text-white uppercase">
          {currentLocale}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition group-hover:text-academixPurpleDark ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div className="top-12 z-50 absolute bg-white shadow-xl border border-academixPurple/15 rounded-md ring-1 ring-black/5 w-56 overflow-hidden end-0">
          <div className="p-1.5">
            {locales.map((item) => {
              const isActive = item === currentLocale;

              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleChange(item)}
                  className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
                    isActive
                      ? "bg-academixPurpleLight text-academixPurpleDark"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="font-medium">{t(item)}</span>
                  {isActive && <Check className="w-4 h-4" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
