"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { Upload, Loader2 } from "lucide-react";
import {
  createStudyMaterial,
  StudyMaterialState,
} from "@/lib/actions/studyMaterial.actions";

const initialState: StudyMaterialState = {
  success: false,
  error: false,
  message: "",
};

type Props = {
  subjectId: number;
  compact?: boolean;
  onSuccess?: () => void;
};

export default function StudyMaterialUpload({
  subjectId,
  compact = false,
  onSuccess,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, isPending] = useActionState(
    createStudyMaterial,
    initialState
  );

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      formRef.current?.reset();
      onSuccess?.();
    } else if (state.error) {
      toast.error(state.message);
    }
  }, [state, onSuccess]);

  return (
    <div
      className={
        compact
          ? ""
          : "bg-white rounded-xl shadow-sm border border-gray-100 p-6"
      }
    >
      {!compact && (
        <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Upload className="w-4 h-4 text-purple-500" />
          Upload Study Material
        </h2>
      )}

      <form ref={formRef} action={formAction} className="space-y-4">
        <input type="hidden" name="subjectId" value={subjectId} />

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            placeholder="e.g. Chapter 3 Notes"
            required
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-purple-300
                       focus:border-transparent"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            name="description"
            placeholder="Optional description..."
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                       focus:outline-none focus:ring-2 focus:ring-purple-300
                       focus:border-transparent resize-none"
          />
        </div>

        {/* File */}
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

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2
                     bg-purple-600 hover:bg-purple-700
                     disabled:bg-purple-300
                     text-white font-medium py-2.5 px-4 rounded-lg
                     transition-colors duration-200 text-sm"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload Material
            </>
          )}
        </button>
      </form>
    </div>
  );
}
