"use client";

import { useActionState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { Upload, Loader2 } from "lucide-react";
import {
  createStudyMaterial,
  StudyMaterialState,
} from "@/lib/actions/studyMaterial.actions";
import { useTranslations } from "next-intl";

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
  const actionsT = useTranslations("actions");
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, isPending] = useActionState(
    createStudyMaterial,
    initialState,
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
        <h2 className="flex items-center gap-2 mb-4 font-semibold text-gray-800 text-base">
          <Upload className="w-4 h-4 text-purple-500" />
          Upload Study Material
        </h2>
      )}

      <form ref={formRef} action={formAction} className="space-y-4 text-start">
        <input type="hidden" name="subjectId" value={subjectId} />

        {/* Title */}
        <div>
          <label className="block mb-1 font-medium text-gray-700 text-sm">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            placeholder="e.g. Chapter 3 Notes"
            required
            className="px-3 py-2 border border-gray-200 focus:border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300 w-full text-sm"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block mb-1 font-medium text-gray-700 text-sm">
            Description
          </label>
          <textarea
            name="description"
            placeholder="Optional description..."
            rows={2}
            className="px-3 py-2 border border-gray-200 focus:border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300 w-full text-sm resize-none"
          />
        </div>

        {/* File */}
        <div>
          <label className="block mb-1 font-medium text-gray-700 text-sm">
            File <span className="text-red-500">*</span>
            <span className="ml-1 text-gray-400 text-xs">(Max 20MB)</span>
          </label>
          <input
            type="file"
            name="file"
            required
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.zip"
            className="hover:file:bg-purple-100 file:bg-purple-50 file:mr-3 file:px-3 file:py-1.5 file:border-0 file:rounded-lg w-full file:font-medium text-gray-500 file:text-purple-700 text-sm file:text-sm cursor-pointer"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="flex justify-center items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 px-4 py-2.5 rounded-lg w-full font-medium text-white text-sm transition-colors duration-200"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {actionsT("uploading")}
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
