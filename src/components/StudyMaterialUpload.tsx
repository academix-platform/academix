"use client";

import { useActionState, useEffect, useRef, useState } from "react";
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
  const t = useTranslations("subjectDetails.materialUpload");
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputId = `study-material-file-${subjectId}`;
  const [selectedFileName, setSelectedFileName] = useState("");

  const [state, formAction, isPending] = useActionState(
    createStudyMaterial,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      toast.success(state.message);
      formRef.current?.reset();
      setSelectedFileName("");
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
          {t("title")}
        </h2>
      )}

      <form ref={formRef} action={formAction} className="space-y-4 text-start">
        <input type="hidden" name="subjectId" value={subjectId} />

        {/* Title */}
        <div>
          <label className="block mb-1 font-medium text-gray-700 text-sm">
            {t("fields.title")} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            placeholder={t("placeholders.title")}
            required
            className="px-3 py-2 border border-gray-200 focus:border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300 w-full text-sm"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block mb-1 font-medium text-gray-700 text-sm">
            {t("fields.description")}
          </label>
          <textarea
            name="description"
            placeholder={t("placeholders.description")}
            rows={2}
            className="px-3 py-2 border border-gray-200 focus:border-transparent rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300 w-full text-sm resize-none"
          />
        </div>

        {/* File */}
        <div>
          <label className="block mb-1 font-medium text-gray-700 text-sm">
            {t("fields.file")} <span className="text-red-500">*</span>
            <span className="ml-1 text-gray-400 text-xs">{t("maxSize")}</span>
          </label>
          <input
            id={fileInputId}
            type="file"
            name="file"
            required
            accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.png,.jpg,.jpeg,.zip"
            className="sr-only"
            onChange={(event) =>
              setSelectedFileName(event.target.files?.[0]?.name ?? "")
            }
          />
          <div className="flex items-center gap-3">
            <label
              htmlFor={fileInputId}
              className="bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-lg font-medium text-purple-700 text-sm cursor-pointer"
            >
              {t("chooseFile")}
            </label>
            <span className="min-w-0 text-gray-500 text-sm truncate">
              {selectedFileName || t("noFileChosen")}
            </span>
          </div>
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
              {t("submit")}
            </>
          )}
        </button>
      </form>
    </div>
  );
}
