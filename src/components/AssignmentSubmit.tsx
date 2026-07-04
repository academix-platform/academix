"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import {
  Upload,
  Loader2,
  X,
  RefreshCw,
  Download,
  CheckCircle,
  Clock,
} from "lucide-react";
import { submitAssignment } from "@/lib/actions/submission.actions";

type Props = {
  assignmentId: number;
  assignmentTitle: string;
  maxScore: number;
  endDate: Date;
  allowLateSubmission: boolean; // ✅ prop جديد
  existingSubmission?: {
    id?: number;
    fileUrl: string;
    fileName: string;
    createdAt: Date;
    note?: string | null;
    teacherFeedback?: string | null;
    score?: number | null;
    gradePublished?: boolean;
  } | null;
};

export default function AssignmentSubmit({
  assignmentId,
  assignmentTitle,
  maxScore,
  endDate,
  allowLateSubmission,
  existingSubmission,
}: Props) {
  const t = useTranslations("assignmentsPage");
  const [open, setOpen] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isOverdue = new Date() > new Date(endDate);

  // ✅ المنطق الجديد:
  // يمكن التسليم إذا: لم ينتهِ الوقت، أو انتهى لكن المعلم سمح بالتسليم المتأخر
  const canSubmit = !isOverdue || allowLateSubmission;
  const isLate = isOverdue && allowLateSubmission;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await submitAssignment(
        { success: false, error: false, message: "" },
        formData,
      );
      if (result.success) {
        toast.success(result.message);
        formRef.current?.reset();
        setSelectedFileName("");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  // ─── زر الحالة ───────────────────────────────────────────────────────────
  const renderButton = () => {
    // عنده تسليم + انتهى الوقت + ما في سماح بالتأخير = عرض فقط
    if (existingSubmission && isOverdue && !allowLateSubmission) {
      return (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 bg-academixPurpleLight hover:brightness-95 px-2.5 py-1.5 rounded-lg font-medium text-academixPurpleDark text-xs transition-colors"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          {t("actions.viewSubmission")}
        </button>
      );
    }

    // عنده تسليم + يمكن التعديل (قبل deadline أو late مسموح)
    if (existingSubmission && canSubmit) {
      return (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 bg-academixPurpleLight hover:brightness-95 px-2.5 py-1.5 rounded-lg font-medium text-academixPurpleDark text-xs transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t("actions.replaceFile")}
          {isLate && <Clock className="w-3 h-3 text-amber-500" />}
        </button>
      );
    }

    // ما عنده تسليم
    if (!existingSubmission) {
      // انتهى الوقت وما في سماح = زر معطّل
      if (isOverdue && !allowLateSubmission) {
        return (
          <button
            type="button"
            disabled
            className="flex items-center gap-1.5 bg-red-50 px-2.5 py-1.5 rounded-lg font-medium text-red-400 text-xs cursor-not-allowed"
          >
            <Upload className="w-3.5 h-3.5" />
            {t("actions.deadlinePassed")}
          </button>
        );
      }

      // يمكن التسليم (قبل deadline أو late مسموح)
      return (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 bg-academixPurpleLight hover:brightness-95 px-2.5 py-1.5 rounded-lg font-medium text-academixPurpleDark text-xs transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          {isLate ? t("actions.submitLateShort") : t("actions.submit")}
          {isLate && <Clock className="w-3 h-3 text-amber-500" />}
        </button>
      );
    }

    return null;
  };

  // ─── هل يُفتح المودال؟ ────────────────────────────────────────────────────
  const canOpenModal =
    canSubmit || (isOverdue && !allowLateSubmission && !!existingSubmission); // view-only

  const isViewOnly = isOverdue && !allowLateSubmission && !!existingSubmission;

  return (
    <div>
      {renderButton()}

      {/* ========== المودال ========== */}
      {open && canOpenModal && (
        <div className="z-50 fixed inset-0 flex justify-center items-center bg-black/40">
          <div className="bg-white shadow-xl mx-4 p-6 rounded-xl w-full max-w-md">
            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-800 text-base">
                {isViewOnly
                  ? t("modal.mySubmission")
                  : existingSubmission
                    ? t("modal.replaceSubmittedFile")
                    : t("modal.submitAssignment")}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="mb-1 font-medium text-gray-700 text-sm">
              {assignmentTitle}
            </p>
            <p className="mb-1 text-gray-400 text-xs">
              {t("modal.due", {
                date: new Date(endDate).toLocaleDateString("en-GB"),
              })}
            </p>

            {/* تنبيه التسليم المتأخر */}
            {isLate && (
              <div className="flex items-center gap-2 bg-amber-50 mb-4 px-3 py-2 border border-amber-200 rounded-lg">
                <Clock className="flex-shrink-0 w-3.5 h-3.5 text-amber-600" />
                <p className="font-medium text-amber-700 text-xs">
                  {t("modal.lateWarning")}
                </p>
              </div>
            )}

            {existingSubmission && (
              <div className="flex items-start gap-2 bg-green-50 mb-4 px-3 py-2 border border-green-100 rounded-lg">
                <CheckCircle className="flex-shrink-0 mt-0.5 w-3.5 h-3.5 text-green-600" />
                <div>
                  <p className="font-medium text-green-700 text-xs">
                    {t("status.assignmentSubmitted")}
                  </p>
                  <p className="mt-0.5 text-green-600 text-xs">
                    {existingSubmission.gradePublished
                      ? t("status.gradePublishedMessage")
                      : t("status.waitingReview")}
                  </p>
                </div>
              </div>
            )}

            {/* الملف المسلَّم */}
            {existingSubmission && (
              <div className="bg-gray-50 mb-4 p-3 border rounded-lg">
                <p className="mb-2 font-medium text-gray-700 text-sm">
                  {t("modal.submittedFile")}
                </p>
                <div className="flex justify-between items-center">
                  <span className="max-w-[200px] text-gray-600 text-sm truncate">
                    {existingSubmission.fileName}
                  </span>
                  <a
                    href={`/api/download/${existingSubmission.id}?type=submission`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:opacity-80 text-academixPurpleDark"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
                <p className="mt-1 text-gray-400 text-xs">
                  {t("modal.submittedDate", {
                    date: new Date(existingSubmission.createdAt).toLocaleDateString(
                      "en-GB",
                    ),
                  })}
                </p>
                {!isViewOnly && (
                  <p className="mt-2 text-amber-600 text-xs">
                    {t("modal.replaceWarning")}
                  </p>
                )}
              </div>
            )}

            {/* Published Grade */}
            {existingSubmission?.gradePublished && existingSubmission.score !== null && existingSubmission.score !== undefined && (
              <div className="bg-academixPurpleLight mb-4 p-3 border border-academixPurpleDark/20 rounded-lg">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-academixPurpleDark text-xs">
                    {t("modal.publishedGrade")}
                  </p>
                  <p className="font-semibold text-academixPurpleDark text-sm">
                    {existingSubmission.score}/{maxScore}
                  </p>
                </div>
              </div>
            )}

            {/* فورم التسليم — يظهر فقط إذا مسموح بالتسليم */}
            {!isViewOnly && (
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                <input type="hidden" name="assignmentId" value={assignmentId} />

                <div>
                  <label className="block mb-1 font-medium text-gray-700 text-sm">
                    {existingSubmission ? t("modal.newFile") : t("modal.file")}{" "}
                    <span className="text-red-500">*</span>
                    <span className="ms-1 text-gray-400 text-xs">
                      {t("modal.maxFileSize")}
                    </span>
                  </label>
                  <input
                    id={`assignment-file-${assignmentId}`}
                    type="file"
                    name="file"
                    required
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.zip"
                    onChange={(event) =>
                      setSelectedFileName(event.target.files?.[0]?.name ?? "")
                    }
                    className="sr-only"
                  />
                  <div className="flex items-center gap-3">
                    <label
                      htmlFor={`assignment-file-${assignmentId}`}
                      className="cursor-pointer rounded-lg bg-academixPurpleLight px-3 py-1.5 text-sm font-medium text-academixPurpleDark hover:brightness-95"
                    >
                      {t("modal.chooseFile")}
                    </label>
                    <span className="truncate text-sm text-gray-500">
                      {selectedFileName || t("modal.noFileChosen")}
                    </span>
                  </div>
                  <p className="mt-1 text-gray-400 text-xs">
                    {t("modal.pdfHint")}
                  </p>
                </div>

                <div>
                  <label className="block mb-1 font-medium text-gray-700 text-sm">
                    {t("modal.note")}{" "}
                    <span className="font-normal text-gray-400">
                      {t("modal.optional")}
                    </span>
                  </label>
                  <textarea
                    name="note"
                    placeholder={t("modal.notePlaceholder")}
                    rows={2}
                    defaultValue={existingSubmission?.note ?? ""}
                    className="bg-white focus:bg-academixPurpleLight px-4 py-3 border-2 border-gray-200 focus:border-academixPurpleDark rounded-lg focus:outline-none focus:ring-0 w-full text-sm transition-all placeholder-gray-400 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 hover:bg-gray-50 py-2 border rounded-lg text-gray-600 text-sm"
                  >
                    {t("actions.cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex flex-1 justify-center items-center gap-2 bg-academixPurpleDark disabled:opacity-60 hover:brightness-90 py-2 rounded-lg font-medium text-white text-sm"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />{" "}
                        {t("actions.processing")}
                      </>
                    ) : existingSubmission ? (
                      <>
                        <RefreshCw className="w-4 h-4" /> {t("actions.replaceFile")}
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />{" "}
                        {isLate ? t("actions.submitLate") : t("actions.submit")}
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* زر Close للـ view-only */}
            {isViewOnly && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="hover:bg-gray-50 mt-2 py-2 border rounded-lg w-full font-medium text-gray-600 text-sm"
              >
                {t("actions.close")}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
