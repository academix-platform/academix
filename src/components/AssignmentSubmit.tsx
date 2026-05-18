"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Upload, Loader2, Send, X, CheckCircle, RefreshCw } from "lucide-react";
import {
  submitAssignment,
  SubmissionState,
} from "@/lib/actions/submission.actions";

const initialState: SubmissionState = {
  success: false,
  error: false,
  message: "",
};

type Props = {
  assignmentId: number;
  assignmentTitle: string;
  endDate: Date;
  existingSubmission?: {
    fileUrl: string;
    fileName: string;
    createdAt: Date;
    note?: string | null;
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
  const isOverdue = new Date() > new Date(endDate);

  const [state, formAction, isPending] = useActionState(
    submitAssignment,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      formRef.current?.reset();
      setOpen(false);
    } else if (state.error) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <div>
      {/* زر الحالة */}
      {existingSubmission ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                     bg-green-50 text-green-700 hover:bg-green-100
                     transition-colors text-xs font-medium"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Submitted · Resubmit
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                     transition-colors text-xs font-medium
                     ${isOverdue
                       ? "bg-red-50 text-red-700 hover:bg-red-100"
                       : "bg-blue-50 text-blue-700 hover:bg-blue-100"
                     }`}
        >
          <Send className="w-3.5 h-3.5" />
          {isOverdue ? "Submit (Late)" : "Submit"}
        </button>
      )}

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 text-base">
                Submit Assignment
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm font-medium text-gray-700 mb-1 truncate">
              {assignmentTitle}
            </p>
            <p className={`text-xs mb-4 ${isOverdue ? "text-red-500" : "text-gray-400"}`}>
              Due:{" "}
              {new Date(endDate).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {isOverdue && " · Overdue"}
            </p>

            {/* تسليم سابق */}
            {existingSubmission && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-100">
                <div className="flex items-center gap-2 text-green-700 text-sm font-medium mb-1">
                  <CheckCircle className="w-4 h-4" />
                  Already submitted
                </div>
                <p className="text-xs text-green-600">
                  File: {existingSubmission.fileName}
                </p>
                <p className="text-xs text-green-500 mt-0.5">
                  {new Date(existingSubmission.createdAt).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <p className="text-xs text-green-500 mt-1">
                  Uploading a new file will replace your previous submission.
                </p>
              </div>
            )}

            <form ref={formRef} action={formAction} className="space-y-4">
              <input type="hidden" name="assignmentId" value={assignmentId} />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File <span className="text-red-500">*</span>
                  <span className="ml-1 text-xs text-gray-400">(Max 20MB)</span>
                </label>
                <input
                  type="file"
                  name="file"
                  required
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.zip"
                  className="w-full text-sm text-gray-500
                             file:mr-3 file:py-1.5 file:px-3
                             file:rounded-lg file:border-0
                             file:text-sm file:font-medium
                             file:bg-blue-50 file:text-blue-700
                             hover:file:bg-blue-100 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  name="note"
                  placeholder="Add a note for your teacher..."
                  rows={2}
                  defaultValue={existingSubmission?.note ?? ""}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-300
                             focus:border-transparent resize-none"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 py-2 px-4 rounded-lg border border-gray-200
                             text-gray-600 hover:bg-gray-50 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 flex items-center justify-center gap-2
                             bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300
                             text-white font-medium py-2 px-4 rounded-lg
                             transition-colors text-sm"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : existingSubmission ? (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Resubmit
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Submit
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}