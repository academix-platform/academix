"use client";

import { Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const locales = ["en", "ar"] as const;

const LanguageSwitcher = () => {
  const locale = useLocale();
  const t = useTranslations("navbar.language");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleChange = (nextLocale: string) => {
    const query = searchParams.toString();
    const href = query ? `${pathname}?${query}` : pathname;

    startTransition(() => {
      document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
      router.replace(href);
      router.refresh();
    });
  };

  return (
    <label className="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-600 shadow-sm">
      <Languages className="h-4 w-4 text-gray-500" aria-hidden="true" />
      <span className="sr-only">{t("label")}</span>
      <select
        value={locale}
        onChange={(event) => handleChange(event.target.value)}
        disabled={isPending}
        aria-label={t("label")}
        className="bg-transparent font-medium outline-none disabled:opacity-60"
      >
        {locales.map((item) => (
          <option key={item} value={item}>
            {t(item)}
          </option>
        ))}
      </select>
    </label>
  );
};

export default LanguageSwitcher;
