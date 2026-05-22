"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { Upload, Loader2, X, RefreshCw, Download, CheckCircle } from "lucide-react";
import { submitAssignment } from "@/lib/actions/submission.actions";

type Props = {
  assignmentId: number;
  assignmentTitle: string;
  endDate: Date;
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
  existingSubmission,
}: Props) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isOverdue = new Date() > new Date(endDate);

  const canSubmit = !isOverdue;
  const canResubmit = !isOverdue && !!existingSubmission;

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

  return (
    <div>
      {/* ========== زر الحالة ========== */}
      {existingSubmission ? (
        isOverdue ? (
          // بعد الـ deadline — عرض فقط مع الفيدباك
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                       bg-green-50 text-green-700 hover:bg-green-100 text-xs font-medium transition-colors"
            title="View your submission"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            View Submission
          </button>
        ) : (
          // قبل الـ deadline — Replace مسموح
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                       bg-green-50 text-green-700 hover:bg-green-100 text-xs font-medium transition-colors"
            title="Replace your submission"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Replace File
          </button>
        )
      ) : (
        // ما في تسليم — Submit
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={!canSubmit}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors
            ${canSubmit
              ? "bg-blue-50 text-blue-700 hover:bg-blue-100"
              : "bg-red-50 text-red-700 cursor-not-allowed"
            }`}
        >
          <Upload className="w-3.5 h-3.5" />
          {isOverdue ? "Submit (Late)" : "Submit"}
        </button>
      )}

      {/* ========== المودال ========== */}
      {open && (canSubmit || canResubmit || (isOverdue && !!existingSubmission)) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-800 text-base">
                {isOverdue && existingSubmission ? "My Submission" : existingSubmission ? "Replace Submitted File" : "Submit Assignment"}
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm font-medium text-gray-700 mb-1">{assignmentTitle}</p>
            <p className="text-xs mb-4 text-gray-400">
              Due: {new Date(endDate).toLocaleDateString("en-GB")}
            </p>

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
                    title="Download your submission"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Submitted: {new Date(existingSubmission.createdAt).toLocaleDateString("en-GB")}
                </p>
                {!isOverdue && (
                  <p className="text-xs text-amber-600 mt-2">
                    ⚠️ Uploading a new file will permanently replace the current one.
                  </p>
                )}
              </div>
            )}

            {/* Teacher Feedback — يظهر للطالب دائماً إذا وجد */}
            {existingSubmission?.teacherFeedback && (
              <div className="mb-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <p className="text-xs font-medium text-indigo-700">Teacher Feedback</p>
                </div>
                <p className="text-sm text-indigo-900 leading-relaxed">
                  {existingSubmission.teacherFeedback}
                </p>
              </div>
            )}

            {!existingSubmission?.teacherFeedback && existingSubmission && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <p className="text-xs text-gray-400 text-center">No teacher feedback yet</p>
              </div>
            )}

            {/* إخفاء الفورم إذا بعد الـ deadline */}
            {!isOverdue && <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
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
                    <><Upload className="w-4 h-4" /> Submit</>
                  )}
                </button>
              </div>
            </form>}

            {/* زر Close للـ isOverdue view-only */}
            {isOverdue && existingSubmission && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-full mt-2 py-2 border rounded-lg text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
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