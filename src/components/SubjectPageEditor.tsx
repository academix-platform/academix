"use client";

import { useState, useTransition, useRef } from "react";
import Image from "next/image";
import {
  Settings,
  X,
  GripVertical,
  Save,
  Loader2,
  ImageIcon,
  Trash2,
  ClipboardList,
  FileText,
  FolderOpen,
} from "lucide-react";
import { saveSubjectPageSettings } from "@/lib/actions/subjectPageSettings.actions";

// ─── Types ────────────────────────────────────────────────────────────────────
type Section = "assignments" | "exams" | "materials";

const SECTION_LABELS: Record<Section, { label: string; icon: React.ReactNode }> = {
  assignments: {
    label: "Assignments",
    icon: <ClipboardList className="w-4 h-4 text-orange-500" />,
  },
  exams: {
    label: "Exams",
    icon: <FileText className="w-4 h-4 text-red-500" />,
  },
  materials: {
    label: "Study Materials",
    icon: <FolderOpen className="w-4 h-4 text-blue-500" />,
  },
};

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
    section === "lessons" ? "exams" : section
  );

  const sections = mapped.filter(
    (section): section is Section =>
      section === "assignments" || section === "exams" || section === "materials"
  );

  return sections.length === 3
    ? sections
    : ["assignments", "exams", "materials"];
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function SubjectPageEditor({ subjectId, initialSettings }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [announcement, setAnnouncement] = useState(initialSettings.announcement ?? "");
  const [description, setDescription] = useState(initialSettings.description ?? "");
  const [bannerImage, setBannerImage] = useState<string | null>(initialSettings.bannerImage);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [removeBanner, setRemoveBanner] = useState(false);
  const [bannerHeight, setBannerHeight] = useState<"sm" | "md" | "lg">(
    (initialSettings.bannerHeight as "sm" | "md" | "lg") ?? "md"
  );
  const [sections, setSections] = useState<Section[]>(
    normalizeSections(initialSettings.sectionsOrder)
  );
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Drag state
  const dragIndex = useRef<number | null>(null);

  // Banner preview
  const [bannerObjectUrl, setBannerObjectUrl] = useState<string | null>(null);

  const bannerPreview = bannerFile
    ? bannerObjectUrl
    : removeBanner
    ? null
    : bannerImage;

  // ─── Drag & Drop ─────────────────────────────────────────────────────────
  function onDragStart(index: number) {
    dragIndex.current = index;
  }

  function onDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === index) return;
    const newSections = [...sections];
    const [moved] = newSections.splice(dragIndex.current, 1);
    newSections.splice(index, 0, moved);
    dragIndex.current = index;
    setSections(newSections);
  }

  function onDragEnd() {
    dragIndex.current = null;
  }

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
        formData
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
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-purple-200
                   bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors text-sm font-medium"
      >
        <Settings className="w-4 h-4" />
        Edit Page
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Panel */}
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Settings className="w-4 h-4 text-purple-600" />
                Edit Subject Page
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Banner Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-gray-400" />
                  Banner Image
                </label>
                {bannerPreview ? (
                  <div className="relative rounded-xl overflow-hidden h-36 bg-gray-100 group">
                    <Image
                      src={bannerPreview}
                      alt="Banner preview"
                      fill
                      className="object-cover"
                    />
                    <button
                      onClick={onRemoveBanner}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg
                                 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center h-36 border-2 border-dashed
                                    border-gray-200 rounded-xl cursor-pointer hover:border-purple-300
                                    hover:bg-purple-50 transition-colors">
                    <ImageIcon className="w-8 h-8 text-gray-300 mb-2" />
                    <span className="text-sm text-gray-400">Click to upload banner</span>
                    <span className="text-xs text-gray-300 mt-1">Max 5MB · JPG, PNG, WebP</span>
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
                  <span className="text-xs text-gray-500">Height:</span>
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
                      {h === "sm" ? "Small" : h === "md" ? "Medium" : "Large"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Announcement */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📢 Announcement
                  <span className="text-gray-400 font-normal ml-1">(shown at top for students)</span>
                </label>
                <textarea
                  value={announcement}
                  onChange={(e) => setAnnouncement(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder='e.g. "Welcome to Mathematics! Please review chapter 3 before Monday."'
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm
                             focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {announcement.length}/500
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📝 Course Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={1000}
                  rows={3}
                  placeholder="Brief description of this subject..."
                  className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm
                             focus:outline-none focus:ring-2 focus:ring-purple-300 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1 text-right">
                  {description.length}/1000
                </p>
              </div>

              {/* Sections Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🗂️ Sections Order
                  <span className="text-gray-400 font-normal ml-1">(drag to reorder)</span>
                </label>
                <ul className="space-y-2">
                  {sections.map((section, index) => (
                    <li
                      key={section}
                      draggable
                      onDragStart={() => onDragStart(index)}
                      onDragOver={(e) => onDragOver(e, index)}
                      onDragEnd={onDragEnd}
                      className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl
                                 border border-gray-100 cursor-grab active:cursor-grabbing
                                 hover:border-purple-200 hover:bg-purple-50 transition-colors select-none"
                    >
                      <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      {SECTION_LABELS[section].icon}
                      <span className="text-sm font-medium text-gray-700">
                        {SECTION_LABELS[section].label}
                      </span>
                      <span className="ml-auto text-xs text-gray-300">{index + 1}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Messages */}
              {successMsg && (
                <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                  ✅ {successMsg}
                </div>
              )}
              {errorMsg && (
                <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  ❌ {errorMsg}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isPending}
                className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white text-sm
                           font-medium rounded-xl hover:bg-purple-700 transition-colors
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
