"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export type SheetPhoto = { key: string; page: number; url: string };

/** Shows the browser's own copy of each uploaded page next to the rows. */
const PhotoPanel = ({ photos }: { photos: SheetPhoto[] }) => {
  const t = useTranslations("classEntry");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const shown = photos.find((photo) => photo.key === selectedKey) ?? photos[photos.length - 1];
  if (!shown) return null;

  return (
    <div className="lg:top-0 lg:sticky flex flex-col gap-2">
      {photos.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label={t("photos")}>
          {photos.map((photo) => (
            <button
              key={photo.key}
              type="button"
              aria-pressed={photo.key === shown.key}
              onClick={() => setSelectedKey(photo.key)}
              className="aria-pressed:bg-academixPurpleDark bg-gray-100 px-3 py-1 rounded-md aria-pressed:text-white text-sm"
            >
              {t("photoOfPage", { page: photo.page })}
            </button>
          ))}
        </div>
      )}
      {/* A blob: URL of the shrunk photo in memory; next/image can't optimise it. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={shown.url}
        alt={t("photoOfPage", { page: shown.page })}
        className="border rounded-md w-full max-h-[80vh] object-contain"
      />
    </div>
  );
};

export default PhotoPanel;
