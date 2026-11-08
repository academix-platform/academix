"use client";

import { useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { Camera, Loader2 } from "lucide-react";
import type { PhotoReadState } from "@/lib/actions/entrySheet.actions";
import { PhotoTooLargeError, shrinkPhoto } from "@/lib/entrySheets/shrinkPhoto";

export type PhotoRead = Extract<PhotoReadState, { success: true }>;

/**
 * Takes or picks one photo of a sheet page, shrinks it, and has the server
 * read it. Filling the screen is up to the caller; nothing is saved here.
 */
const PhotoUpload = ({
  fields,
  read,
  messages,
  onRead,
}: {
  /** Which sheets the photo may belong to, sent with the photo. */
  fields: Record<string, string>;
  read: (formData: FormData) => Promise<PhotoReadState>;
  /** Holds uploadPhoto, readingPhoto, photoHint and photoErrors. */
  messages: "classEntry" | "attendanceSheet";
  onRead: (read: PhotoRead, photo: Blob) => void;
}) => {
  const t = useTranslations(messages);
  const input = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const upload = (file: File) =>
    startTransition(async () => {
      let photo: Blob;
      try {
        photo = await shrinkPhoto(file);
      } catch (err) {
        toast.error(t(err instanceof PhotoTooLargeError ? "photoErrors.tooLarge" : "photoErrors.openFailed"));
        return;
      }

      const formData = new FormData();
      for (const [name, value] of Object.entries(fields)) formData.set(name, value);
      formData.set("photo", photo, "sheet.jpg");

      const result = await read(formData);
      if (result.success) onRead(result, photo);
      else toast.error(t(`photoErrors.${result.reason}`));
    });

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* No `capture`, so phones offer both the camera and the gallery. */}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) upload(file);
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={isPending}
        className="inline-flex items-center gap-2 bg-academixSky disabled:opacity-60 px-3 py-2 rounded-md text-sm"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden /> : <Camera className="w-4 h-4" aria-hidden />}
        {t("uploadPhoto")}
      </button>
      <p className="text-gray-600 text-sm" role="status">
        {isPending ? t("readingPhoto") : t("photoHint")}
      </p>
    </div>
  );
};

export default PhotoUpload;
