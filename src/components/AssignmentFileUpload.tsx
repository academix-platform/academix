"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { Upload, Loader2, Paperclip, X } from "lucide-react";
import {
  uploadAssignmentFile,
  AssignmentFileState,
} from "@/lib/actions/assignmentFile.actions";
import { useTranslations } from "next-intl";

const initialState: AssignmentFileState = {
  success: false,
  error: false,
  message: "",
};

type Props = {
  assignmentId: number;
  assignmentTitle: string;
  currentFileUrl?: string | null;
  currentFileName?: string | null;
};

export default function AssignmentFileUpload({
  assignmentId,
  assignmentTitle,
  currentFileUrl,
  currentFileName,
}: Props) {
  const actionsT = useTranslations("actions");
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, isPending] = useActionState(
    uploadAssignmentFile,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      formRef.current?.reset();
      queueMicrotask(() => setOpen(false));
    } else if (state.error) {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <div>
      {/* زر فتح الفورم */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        title={currentFileUrl ? "Replace file" : "Attach file"}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors
          ${currentFileUrl
            ? "bg-green-50 text-green-700 hover:bg-green-100"
            : "bg-purple-50 text-purple-700 hover:bg-purple-100"
          }`}
      >
        <Paperclip className="w-3.5 h-3.5" />
        {currentFileUrl ? "Replace File" : "Attach File"}
      </button>

      {/* فورم الرفع */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800 text-base">
                Attach File to Assignment
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4 truncate">
              {assignmentTitle}
            </p>

            {currentFileUrl && (
              <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-100 text-sm text-green-700">
                Current file: <span className="font-medium">{currentFileName}</span>
                <br />
                <span className="text-xs text-green-500">Uploading a new file will replace it.</span>
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
                             file:bg-purple-50 file:text-purple-700
                             hover:file:bg-purple-100 cursor-pointer"
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
                             bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300
                             text-white font-medium py-2 px-4 rounded-lg
                             transition-colors text-sm"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {actionsT("uploading")}
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Upload
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
