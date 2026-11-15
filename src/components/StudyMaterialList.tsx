"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "react-toastify";
import {
  FileText,
  FileImage,
  File,
  Download,
  Trash2,
  Loader2,
  BookOpen,
  X,
  Upload,
} from "lucide-react";
import {
  deleteStudyMaterial,
  StudyMaterialState,
} from "@/lib/actions/studyMaterial.actions";
import StudyMaterialUpload from "@/components/StudyMaterialUpload";
import { useTranslations, useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────
export type StudyMaterialItem = {
  id: number;
  title: string;
  description: string | null;
  fileUrl: string;
  fileType: string;
  fileName: string;
  createdAt: Date;
  teacher: { id: string; name: string };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function FileIcon({ type }: { type: string }) {
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(type))
    return <FileImage className="w-8 h-8 text-blue-500 shrink-0" />;
  if (type === "pdf") return <FileText className="w-8 h-8 text-rose-500 shrink-0" />;
  return <File className="w-8 h-8 text-slate-400 shrink-0" />;
}

// ─── Delete button ────────────────────────────────────────────────────────────
function DeleteButton({ id, subjectId }: { id: number; subjectId: number }) {
  const t = useTranslations("subjectDetails");
  const init: StudyMaterialState = {
    success: false,
    error: false,
    message: "",
  };
  const [state, formAction, isPending] = useActionState(
    deleteStudyMaterial,
    init,
  );

  useEffect(() => {
    if (state.success) toast.success(state.message);
    else if (state.error) toast.error(state.message);
  }, [state]);

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="subjectId" value={subjectId} />
      <button
        type="submit"
        disabled={isPending}
        title={t("delete")}
        className="hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-40 p-2 rounded-xl border border-outline bg-surface text-content-muted hover:text-rose-600 transition-colors cursor-pointer"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Trash2 className="w-4 h-4" />
        )}
      </button>
    </form>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
type Props = {
  materials: StudyMaterialItem[];
  subjectId: number;
  currentUserId?: string;
  role?: string;
};

export default function StudyMaterialList({
  materials,
  subjectId,
  currentUserId,
  role,
}: Props) {
  const emptyT = useTranslations("emptyStates");
  const t = useTranslations("subjectDetails");
  const locale = useLocale();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const canUpload = role === "teacher" || role === "admin";

  if (materials.length === 0) {
    return (
      <div className="bg-surface border border-outline/80 rounded-2xl p-8 sm:p-12 shadow-2xs text-center">
        <div className="w-12 h-12 rounded-2xl bg-brandPurple-50 dark:bg-brandPurple-950/40 text-brandPurple-600 dark:text-brandPurple-400 border border-brandPurple-100 dark:border-brandPurple-900/40 flex items-center justify-center mx-auto mb-3 shadow-2xs">
          <BookOpen className="w-6 h-6" />
        </div>
        <p className="font-semibold text-content-primary">{emptyT("studyMaterials")}</p>
        <p className="mt-1 text-content-muted text-xs sm:text-sm max-w-sm mx-auto">
          {role === "teacher"
            ? emptyT("uploadFirstMaterial")
            : emptyT("noStudyMaterialsForStudent")}
        </p>
        {canUpload && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            leftIcon={<Upload className="w-4 h-4" />}
            className="mt-4"
          >
            {emptyT("uploadMaterial")}
          </Button>
        )}
        {isUploadOpen && (
          <div className="z-50 fixed inset-0 flex justify-center items-center p-4">
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
              onClick={() => setIsUploadOpen(false)}
            />
            <div className="relative bg-surface shadow-2xl p-6 border border-outline rounded-2xl w-full max-w-xl">
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-outline/60">
                <h3 className="font-bold text-content-primary text-base">
                  {t("materialUpload.title")}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="hover:bg-surface-muted p-1.5 rounded-xl text-content-muted hover:text-content-primary transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <StudyMaterialUpload
                subjectId={subjectId}
                compact
                onSuccess={() => setIsUploadOpen(false)}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-surface border border-outline/80 rounded-2xl shadow-2xs overflow-hidden">
      <div className="flex justify-between items-center px-5 py-3.5 border-b border-outline/60 bg-surface-muted/30">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-brandPurple-50 dark:bg-brandPurple-950/50 text-brandPurple-600 dark:text-brandPurple-400 border border-brandPurple-100 dark:border-brandPurple-900/40">
            <BookOpen className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-content-primary text-sm sm:text-base">
            {t("studyMaterials")}
          </h2>
          <Badge variant="secondary" size="sm">
            {materials.length}
          </Badge>
        </div>
        {canUpload && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => setIsUploadOpen(true)}
            leftIcon={<Upload className="w-3.5 h-3.5" />}
          >
            {t("upload")}
          </Button>
        )}
      </div>

      <ul className="divide-y divide-outline/40 max-h-[380px] overflow-auto">
        {materials.map((m) => {
          const isOwner =
            role === "admin" ||
            (role === "teacher" && currentUserId === m.teacher.id);

          return (
            <li
              key={m.id}
              className="flex items-start gap-4 hover:bg-surface-muted/30 px-5 py-3.5 transition-colors"
            >
              {/* File Icon */}
              <div className="shrink-0 mt-0.5">
                <FileIcon type={m.fileType} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-content-primary truncate text-sm">
                    {m.title}
                  </span>
                  <Badge variant="outline" size="sm" className="uppercase font-bold tracking-wider text-[10px]">
                    {m.fileType}
                  </Badge>
                </div>

                {m.description && (
                  <p className="mt-1 text-content-secondary text-xs sm:text-sm line-clamp-2">
                    {m.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-content-muted text-xs">
                  <span className="font-medium">{m.teacher.name}</span>
                  <span>·</span>
                  <span>
                    {new Date(m.createdAt).toLocaleDateString(locale, {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span>·</span>
                  <span className="max-w-[160px] truncate">{m.fileName}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex shrink-0 items-center gap-1.5 self-center">
                <a
                  href={`/api/download/${m.id}?type=studyMaterial`}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={m.fileName}
                  title={t("download")}
                  className="p-2 rounded-xl border border-outline bg-surface hover:bg-surface-muted text-content-secondary hover:text-brandPurple-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </a>

                {isOwner && <DeleteButton id={m.id} subjectId={subjectId} />}
              </div>
            </li>
          );
        })}
      </ul>

      {isUploadOpen && (
        <div className="z-50 fixed inset-0 flex justify-center items-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setIsUploadOpen(false)}
          />
          <div className="relative bg-surface shadow-2xl p-6 border border-outline rounded-2xl w-full max-w-xl">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-outline/60">
              <h3 className="font-bold text-content-primary text-base">
                {t("materialUpload.title")}
              </h3>
              <button
                type="button"
                onClick={() => setIsUploadOpen(false)}
                className="hover:bg-surface-muted p-1.5 rounded-xl text-content-muted hover:text-content-primary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <StudyMaterialUpload
              subjectId={subjectId}
              compact
              onSuccess={() => setIsUploadOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
