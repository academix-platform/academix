"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Upload, Loader2, X, RefreshCw, Download, CheckCircle, Clock } from "lucide-react";
import { submitAssignment } from "@/lib/actions/submission.actions";

type Props = {
  assignmentId: number;
  assignmentTitle: string;
  endDate: Date;
  allowLateSubmission: boolean; // ✅ prop جديد
  existingSubmission?: {
    id?: number;
    fileUrl: string;
    fileName: string;
    createdAt: Date;
    note?: string | null;
    teacherFeedback?: string | null;
  } | null;
};

export default function AssignmentSubmit({
  assignmentId,
  assignmentTitle,
  endDate,
  allowLateSubmission,
  existingSubmission,
}: Props) {
  const [open, setOpen] = useState(false);
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
        formData
      );
      if (result.success) {
        toast.success(result.message);
        formRef.current?.reset();
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
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                     bg-green-50 text-green-700 hover:bg-green-100 text-xs font-medium transition-colors"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          View Submission
        </button>
      );
    }

    // عنده تسليم + يمكن التعديل (قبل deadline أو late مسموح)
    if (existingSubmission && canSubmit) {
      return (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                     bg-green-50 text-green-700 hover:bg-green-100 text-xs font-medium transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Replace File
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
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                       bg-red-50 text-red-400 cursor-not-allowed text-xs font-medium"
          >
            <Upload className="w-3.5 h-3.5" />
            Deadline Passed
          </button>
        );
      }

      // يمكن التسليم (قبل deadline أو late مسموح)
      return (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                     bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium transition-colors"
        >
          <Upload className="w-3.5 h-3.5" />
          {isLate ? "Submit (Late)" : "Submit"}
          {isLate && <Clock className="w-3 h-3 text-amber-500" />}
        </button>
      );
    }

    return null;
  };

  // ─── هل يُفتح المودال؟ ────────────────────────────────────────────────────
  const canOpenModal =
    canSubmit ||
    (isOverdue && !allowLateSubmission && !!existingSubmission); // view-only

  const isViewOnly = isOverdue && !allowLateSubmission && !!existingSubmission;

  return (
    <div>
      {renderButton()}

      {/* ========== المودال ========== */}
      {open && canOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">

            {/* Header */}
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-800 text-base">
                {isViewOnly
                  ? "My Submission"
                  : existingSubmission
                  ? "Replace Submitted File"
                  : "Submit Assignment"}
              </h3>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm font-medium text-gray-700 mb-1">{assignmentTitle}</p>
            <p className="text-xs mb-1 text-gray-400">
              Due: {new Date(endDate).toLocaleDateString("en-GB")}
            </p>

            {/* تنبيه التسليم المتأخر */}
            {isLate && (
              <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-700 font-medium">
                  You are submitting after the deadline. Late submission is allowed for this assignment.
                </p>
              </div>
            )}

            {/* الملف المسلَّم */}
            {existingSubmission && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                <p className="text-sm font-medium text-gray-700 mb-2">Submitted file</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 truncate max-w-[200px]">
                    {existingSubmission.fileName}
                  </span>
                  <a
                    href={`/api/download/${existingSubmission.id}?type=submission`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Submitted: {new Date(existingSubmission.createdAt).toLocaleDateString("en-GB")}
                </p>
                {!isViewOnly && (
                  <p className="text-xs text-amber-600 mt-2">
                    ⚠️ Uploading a new file will permanently replace the current one.
                  </p>
                )}
              </div>
            )}

            {/* Teacher Feedback */}
            {existingSubmission?.teacherFeedback ? (
              <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <p className="text-xs font-medium text-indigo-700">Teacher Feedback</p>
                </div>
                <p className="text-sm text-indigo-900 leading-relaxed">
                  {existingSubmission.teacherFeedback}
                </p>
              </div>
            ) : existingSubmission ? (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-xs text-gray-400 text-center">No teacher feedback yet</p>
              </div>
            ) : null}

            {/* فورم التسليم — يظهر فقط إذا مسموح بالتسليم */}
            {!isViewOnly && (
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                <input type="hidden" name="assignmentId" value={assignmentId} />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {existingSubmission ? "New File" : "File"}{" "}
                    <span className="text-red-500">*</span>
                    <span className="ml-1 text-xs text-gray-400">(Max 20MB)</span>
                  </label>
                  <input
                    type="file"
                    name="file"
                    required
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.zip"
                    className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3
                               file:rounded-lg file:border-0 file:text-sm file:font-medium
                               file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Note <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    name="note"
                    placeholder="Add a note for your teacher..."
                    rows={2}
                    defaultValue={existingSubmission?.note ?? ""}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none
                               focus:ring-2 focus:ring-blue-300 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex-1 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 flex items-center justify-center gap-2
                               bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300
                               text-white font-medium py-2 rounded-lg text-sm"
                  >
                    {isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                    ) : existingSubmission ? (
                      <><RefreshCw className="w-4 h-4" /> Replace File</>
                    ) : (
                      <><Upload className="w-4 h-4" /> {isLate ? "Submit Late" : "Submit"}</>
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
                className="w-full mt-2 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium"
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}