"use client";

import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";

export default function FreezeOverlay({ isFrozen }: { isFrozen: boolean }) {
  const t = useTranslations("examTaking.freeze");

  if (!isFrozen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/80 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-lg shadow-xl text-center max-w-md w-full mx-4">
        <WifiOff className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t("title")}</h2>
        <p className="text-gray-600 mb-6 leading-relaxed">
          {t("body")}
        </p>
        <div className="flex justify-center">
          <div className="animate-pulse flex items-center text-academixPurpleDark font-medium">
            <div className="w-2 h-2 bg-academixPurpleDark rounded-full me-2"></div>
            {t("waiting")}
          </div>
        </div>
      </div>
    </div>
  );
}
