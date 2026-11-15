"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  Settings,
  X,
  Save,
  Loader2,
  ImageIcon,
  Trash2,
} from "lucide-react";
import { saveSubjectPageSettings } from "@/lib/actions/subjectPageSettings.actions";
import { useTranslations } from "next-intl";
import { useMounted } from "@/hooks/useMounted";

// ─── Types ────────────────────────────────────────────────────────────────────
type Section = "assignments" | "exams" | "materials";
const ANNOUNCEMENT_MAX_WORDS = 12;
const DESCRIPTION_MAX_WORDS = 24;
const countWords = (value: string) =>
  value.trim().split(/\s+/).filter(Boolean).length;
const limitWords = (value: string, maxWords: number) =>
  value.trim().split(/\s+/).filter(Boolean).slice(0, maxWords).join(" ");

interface Props {
  subjectId: number;
  initialSettings: {
    announcement: string | null;
    description: string | null;
    bannerImage: string | null;
    bannerHeight: string | null;
    sectionsOrder: string[];
  };
}

const normalizeSections = (sectionsOrder: string[]): Section[] => {
  const mapped = sectionsOrder.map((section) =>
    section === "lessons" ? "exams" : section,
  );

  const sections = mapped.filter(
    (section): section is Section =>
      section === "assignments" ||
      section === "exams" ||
      section === "materials",
  );

  return sections.length === 3
    ? sections
    : ["assignments", "exams", "materials"];
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function SubjectPageEditor({
  subjectId,
  initialSettings,
}: Props) {
  const t = useTranslations("subjectDetails.editor");
  const [open, setOpen] = useState(false);
  const mounted = useMounted();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Form state
  const [announcement, setAnnouncement] = useState(
    initialSettings.announcement ?? "",
  );
  const [description, setDescription] = useState(
    initialSettings.description ?? "",
  );
  const [bannerImage, setBannerImage] = useState<string | null>(
    initialSettings.bannerImage,
  );
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [removeBanner, setRemoveBanner] = useState(false);
  const [bannerHeight, setBannerHeight] = useState<"sm" | "md" | "lg">(
    (initialSettings.bannerHeight as "sm" | "md" | "lg") ?? "md",
  );
  const sections = normalizeSections(initialSettings.sectionsOrder);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  // Banner preview
  const [bannerObjectUrl, setBannerObjectUrl] = useState<string | null>(null);
  const announcementWords = countWords(announcement);
  const descriptionWords = countWords(description);

  const bannerPreview = bannerFile
    ? bannerObjectUrl
    : removeBanner
      ? null
      : bannerImage;

  // ─── Banner file pick ─────────────────────────────────────────────────────
  function onBannerChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBannerFile(file);
    setRemoveBanner(false);
    const url = URL.createObjectURL(file);
    setBannerObjectUrl(url);
  }

  function onRemoveBanner() {
    setBannerFile(null);
    setBannerObjectUrl(null);
    setRemoveBanner(true);
    setBannerImage(null);
  }

  // ─── Save ─────────────────────────────────────────────────────────────────
  function handleSave() {
    setSuccessMsg("");
    setErrorMsg("");

    const formData = new FormData();
    formData.set("subjectId", String(subjectId));
    formData.set("announcement", announcement);
    formData.set("description", description);
    formData.set("sectionsOrder", JSON.stringify(sections));
    formData.set("removeBanner", String(removeBanner));
    formData.set("bannerHeight", bannerHeight);
    if (bannerFile) formData.set("bannerImage", bannerFile);

    startTransition(async () => {
      const result = await saveSubjectPageSettings(
        { success: false, error: false, message: "" },
        formData,
      );
      if (result.success) {
        setSuccessMsg(result.message);
        setBannerFile(null);
        setTimeout(() => {
          setOpen(false);
          setSuccessMsg("");
        }, 1200);
      } else {
        setErrorMsg(result.message);
      }
    });
  }

  return (
    <>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 bg-brandPurple-50 dark:bg-brandPurple-950/40 hover:bg-brandPurple-100 dark:hover:bg-brandPurple-900/50 px-3.5 py-2 border border-brandPurple-200 dark:border-brandPurple-800/60 rounded-xl font-semibold text-brandPurple-700 dark:text-brandPurple-300 text-xs sm:text-sm transition-colors shadow-2xs cursor-pointer"
      >
        <Settings className="w-4 h-4" />
        <span>{t("trigger")}</span>
      </button>

      {/* Overlay */}
      {open &&
        mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="z-[100] fixed inset-0 flex justify-center items-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in-0 duration-200"
              onClick={() => setOpen(false)}
            />

            {/* Panel */}
            <div className="relative bg-surface border border-outline shadow-2xl rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex justify-between items-center px-6 py-4 border-outline/60 border-b">
                <h2 className="flex items-center gap-2 font-bold text-content-primary text-base">
                  <Settings className="w-4 h-4 text-brandPurple-600 dark:text-brandPurple-400" />
                  {t("title")}
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="hover:bg-surface-muted p-1.5 rounded-xl text-content-muted hover:text-content-primary transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

            <div className="space-y-6 p-6">
              {/* Banner Image */}
              <div>
                <label className="block flex items-center gap-1.5 mb-2 font-medium text-gray-700 text-sm">
                  <ImageIcon className="w-4 h-4 text-gray-400" />
                  {t("bannerImage")}
                </label>
                {bannerPreview ? (
                  <div className="group relative bg-gray-100 rounded-xl h-36 overflow-hidden">
                    <Image
                      src={bannerPreview}
                      alt={t("bannerPreviewAlt")}
                      fill
                      className="object-cover"
                    />
                    <button
                      onClick={onRemoveBanner}
                      className="top-2 right-2 absolute bg-red-500 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col justify-center items-center hover:bg-purple-50 border-2 border-gray-200 hover:border-purple-300 border-dashed rounded-xl h-36 transition-colors cursor-pointer">
                    <ImageIcon className="mb-2 w-8 h-8 text-gray-300" />
                    <span className="text-gray-400 text-sm">
                      {t("uploadBanner")}
                    </span>
                    <span className="mt-1 text-gray-300 text-xs">
                      {t("bannerHint")}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={onBannerChange}
                    />
                  </label>
                )}

                {/* Height selector */}
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-gray-500 text-xs">{t("height")}</span>
                  {(["sm", "md", "lg"] as const).map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setBannerHeight(h)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                        bannerHeight === h
                          ? "bg-purple-600 text-white border-purple-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-purple-300"
                      }`}
                    >
                      {t(`heights.${h}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Announcement */}
              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  {t("announcement")}
                  <span className="ml-1 font-normal text-gray-400">
                    {t("announcementHint")}
                  </span>
                </label>
                <textarea
                  value={announcement}
                  onChange={(e) =>
                    setAnnouncement(limitWords(e.target.value, ANNOUNCEMENT_MAX_WORDS))
                  }
                  maxLength={500}
                  rows={1}
                  placeholder={t("announcementPlaceholder")}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 w-full text-sm resize-none"
                />
                <p className="mt-1 text-gray-400 text-xs text-right">
                  {t("wordCount", {
                    count: announcementWords,
                    max: ANNOUNCEMENT_MAX_WORDS,
                  })}
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block mb-2 font-medium text-gray-700 text-sm">
                  {t("courseDescription")}
                </label>
                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(limitWords(e.target.value, DESCRIPTION_MAX_WORDS))
                  }
                  maxLength={1000}
                  rows={2}
                  placeholder={t("descriptionPlaceholder")}
                  className="px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-300 w-full text-sm resize-none"
                />
                <p className="mt-1 text-gray-400 text-xs text-right">
                  {t("wordCount", {
                    count: descriptionWords,
                    max: DESCRIPTION_MAX_WORDS,
                  })}
                </p>
              </div>
              {/* Messages */}
              {successMsg && (
                <div className="bg-green-50 px-4 py-3 border border-green-200 rounded-xl text-green-700 text-sm">
                  ✅ {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="bg-red-50 px-4 py-3 border border-red-200 rounded-xl text-red-700 text-sm">
                  ❌ {errorMsg}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end items-center gap-3 px-6 py-4 border-gray-100 border-t">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm transition-colors"
              >
                {t("cancel")}
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 px-5 py-2 rounded-xl font-medium text-white text-sm transition-colors disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {t("saveChanges")}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
