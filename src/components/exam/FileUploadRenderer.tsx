"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-toastify";
import { Upload, X, FileText, AlertCircle, CheckCircle, Loader2, Replace } from "lucide-react";
import { BLOCKED_EXTENSIONS, isFileConfig, EXAM_FILE_MAX_SIZE_MB } from "@/lib/formValidationSchemas";
import type { FileConfig } from "@/lib/formValidationSchemas";
import { getExamUploadSignature, saveAnswer, deleteOldExamFileOnReplace } from "@/lib/actions/examWorkflow.actions";

type UploadedFile = {
  fileUrl: string;
  filePublicId: string;
  fileOriginalName: string;
  fileMimeType: string;
  fileSizeBytes: number;
};

type SignatureResponse = {
  signature: string;
  timestamp: number;
  folder: string;
  apiKey: string;
  cloudName: string;
};

type UploadState =
  | { status: "idle" }
  | { status: "uploading"; progress: number; fileName: string; abortController: AbortController }
  | { status: "uploaded"; file: UploadedFile }
  | { status: "error"; message: string; fileName?: string }
  | { status: "removing" };

interface FileUploadRendererProps {
  answerId: number | null;
  submissionId: number;
  examId: number;
  questionId: number;
  question: { id: number; options: unknown };
  initialFileUrl: string | null;
  initialFilePublicId: string | null;
  initialFileOriginalName: string | null;
  initialFileMimeType: string | null;
  initialFileSizeBytes: number | null;
  disabled?: boolean;
  onUploadStart?: () => void;
  onUploadEnd?: () => void;
  onFileMetaSaved?: (meta: UploadedFile & { questionId: number }) => void;
}

const uploadToCloudinary = (
  file: File,
  sig: SignatureResponse,
  onProgress: (pct: number) => void,
  signal: AbortSignal
): Promise<UploadedFile> => {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", sig.apiKey);
    formData.append("signature", sig.signature);
    formData.append("timestamp", String(sig.timestamp));
    formData.append("folder", sig.folder);
    formData.append("type", "private");
    formData.append("resource_type", "raw");

    const xhr = new XMLHttpRequest();
    signal.addEventListener("abort", () => xhr.abort());

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener("load", () => {
      if (xhr.status === 200) {
        try {
          const resp = JSON.parse(xhr.responseText);
          const originalName = file.name;
          const extIndex = originalName.lastIndexOf(".");
          const ext = extIndex !== -1 ? originalName.slice(extIndex + 1) : resp.format || "bin";
          resolve({
            fileUrl: resp.secure_url,
            filePublicId: resp.public_id,
            fileOriginalName: originalName,
            fileMimeType: `raw/${ext}`,
            fileSizeBytes: resp.bytes,
          });
        } catch (err) {
          reject(new Error("Failed to parse upload response"));
        }
      } else {
        let detail = xhr.responseText;
        try {
          detail = JSON.parse(xhr.responseText).error?.message || detail;
        } catch {}
        reject(new Error(`Upload failed (${xhr.status}): ${detail}`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.addEventListener("abort", () => reject(new Error("Upload aborted")));

    xhr.open("POST", `https://api.cloudinary.com/v1_1/${sig.cloudName}/raw/upload`);
    xhr.send(formData);
  });
};

const saveFileMetaToDB = async (
  submissionId: number,
  questionId: number,
  file: UploadedFile,
  retries = 3
): Promise<boolean> => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await saveAnswer(
        { success: true, error: false },
        {
          submissionId,
          questionId,
          fileUrl: file.fileUrl,
          filePublicId: file.filePublicId,
          fileOriginalName: file.fileOriginalName,
          fileMimeType: file.fileMimeType,
          fileSizeBytes: file.fileSizeBytes,
        }
      );

      if (res.success) return true;

      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
      }
    } catch {
      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, (attempt + 1) * 1000));
      }
    }
  }
  return false;
};

const formatFileSize = (bytes: number): string => {
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
};

const getFileIcon = (type: string) => {
  const subtype = type.split("/")?.[1]?.toLowerCase() || "";
  if (["pdf"].includes(subtype)) return "PDF";
  if (["doc", "docx"].includes(subtype)) return "DOC";
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(subtype)) return "IMG";
  return "FILE";
};

export default function FileUploadRenderer({
  answerId,
  submissionId,
  examId,
  questionId,
  question,
  initialFileUrl,
  initialFilePublicId,
  initialFileOriginalName,
  initialFileMimeType,
  initialFileSizeBytes,
  disabled = false,
  onUploadStart,
  onUploadEnd,
  onFileMetaSaved,
}: FileUploadRendererProps) {
  const fileConfig: FileConfig | null = isFileConfig(question.options)
    ? question.options
    : null;

  const [uploadState, setUploadState] = useState<UploadState>(() => {
    if (initialFileUrl && initialFilePublicId && initialFileOriginalName) {
      return {
        status: "uploaded",
        file: {
          fileUrl: initialFileUrl,
          filePublicId: initialFilePublicId,
          fileOriginalName: initialFileOriginalName,
          fileMimeType: initialFileMimeType || "raw/bin",
          fileSizeBytes: initialFileSizeBytes || 0,
        },
      };
    }
    return { status: "idle" };
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current as any;
    if (el) {
      el.__abortUpload = () => {
        if (uploadState.status === "uploading") {
          uploadState.abortController.abort();
        }
      };
    }
  });

  // Retry pending file save from localStorage on mount
  useEffect(() => {
    const pendingKey = `exam_pending_file_${submissionId}_${questionId}`;
    const pending = localStorage.getItem(pendingKey);
    if (!pending) return;

    try {
      const pendingFile: UploadedFile = JSON.parse(pending);
      saveFileMetaToDB(submissionId, questionId, pendingFile).then((saved) => {
        if (saved) {
          localStorage.removeItem(pendingKey);
          setUploadState({ status: "uploaded", file: pendingFile });
          onFileMetaSaved?.({ ...pendingFile, questionId });
        }
      });
    } catch {
      localStorage.removeItem(pendingKey);
    }
  }, [submissionId, questionId, onFileMetaSaved]);

  const validateFile = useCallback(
    (file: File): string | null => {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      if (BLOCKED_EXTENSIONS.has(ext)) {
        return `File type ".${ext}" is not allowed.`;
      }

      if (fileConfig && fileConfig.allowedExtensions.length > 0) {
        if (!fileConfig.allowedExtensions.includes(ext)) {
          return `Only ${fileConfig.allowedExtensions.join(", ")} files are allowed.`;
        }
      }

      if (fileConfig && fileConfig.minFileSizeMb > 0) {
        if (file.size < fileConfig.minFileSizeMb * 1024 * 1024) {
          return `File size must be at least ${fileConfig.minFileSizeMb} MB.`;
        }
      }

      const maxMb = fileConfig?.maxFileSizeMb ?? EXAM_FILE_MAX_SIZE_MB;
      if (file.size > maxMb * 1024 * 1024) {
        return `File size exceeds ${maxMb} MB limit.`;
      }

      return null;
    },
    [fileConfig]
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const oldFilePublicId =
      uploadState.status === "uploaded" ? uploadState.file.filePublicId : null;

    if (uploadState.status === "uploaded") {
      const sameFile =
        uploadState.file.fileOriginalName === file.name &&
        uploadState.file.fileSizeBytes === file.size;
      if (sameFile) {
        const confirmed = window.confirm(
          "This file appears identical to the current upload. Replace anyway?"
        );
        if (!confirmed) {
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }
      }
    }

    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const abortController = new AbortController();

    setUploadState({
      status: "uploading",
      progress: 0,
      fileName: file.name,
      abortController,
    });

    onUploadStart?.();

    try {
      const sigResult = await getExamUploadSignature(examId, submissionId, questionId);

      if ("error" in sigResult) {
        throw new Error(sigResult.error);
      }

      const sig: SignatureResponse = sigResult;

      const uploadedFile = await uploadToCloudinary(file, sig, (pct) => {
        setUploadState((prev) =>
          prev.status === "uploading" ? { ...prev, progress: pct } : prev
        );
      }, abortController.signal);

      const saved = await saveFileMetaToDB(submissionId, questionId, uploadedFile);

      if (!saved) {
        localStorage.setItem(
          `exam_pending_file_${submissionId}_${questionId}`,
          JSON.stringify(uploadedFile)
        );
        setUploadState({ status: "error", message: "Failed to save file metadata. Your file is saved locally and will be retried.", fileName: file.name });
        onUploadEnd?.();
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      if (oldFilePublicId) {
        deleteOldExamFileOnReplace(oldFilePublicId, submissionId, questionId).catch(() => {});
      }

      setUploadState({ status: "uploaded", file: uploadedFile });
      onFileMetaSaved?.({ ...uploadedFile, questionId });
      onUploadEnd?.();
    } catch (err: any) {
      if (err.message === "Upload aborted") {
        setUploadState({ status: "idle" });
      } else {
        setUploadState({
          status: "error",
          message: err.message || "Upload failed",
          fileName: file.name,
        });
      }
      onUploadEnd?.();
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemove = async () => {
    if (uploadState.status !== "uploaded") return;

    setUploadState({ status: "removing" });

    try {
      const res = await saveAnswer(
        { success: true, error: false },
        {
          submissionId,
          questionId,
          fileUrl: null,
          filePublicId: null,
          fileOriginalName: null,
          fileMimeType: null,
          fileSizeBytes: null,
        }
      );

      if (res.success) {
        setUploadState({ status: "idle" });
        onFileMetaSaved?.({ fileUrl: "", filePublicId: "", fileOriginalName: "", fileMimeType: "", fileSizeBytes: 0, questionId });
      } else {
        setUploadState({ status: "uploaded", file: uploadState.file });
        toast.error("Failed to remove file.");
      }
    } catch {
      setUploadState({ status: "uploaded", file: uploadState.file });
      toast.error("Failed to remove file.");
    }
  };

  const handleReplaceClick = () => {
    fileInputRef.current?.click();
  };

  const handleRetry = () => {
    setUploadState({ status: "idle" });
  };

  const acceptedExtensions = fileConfig?.allowedExtensions?.length
    ? fileConfig.allowedExtensions.map((e) => `.${e}`).join(",")
    : undefined;

  const maxSizeStr = fileConfig?.maxFileSizeMb
    ? `${fileConfig.maxFileSizeMb} MB`
    : `${EXAM_FILE_MAX_SIZE_MB} MB`;

  return (
    <div ref={rootRef} data-file-upload-question={questionId} className="w-full">
      {uploadState.status === "idle" && (
        <div className="flex flex-col gap-3">
          {fileConfig?.instructions && (
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {fileConfig.instructions}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-400">
            {fileConfig && fileConfig.allowedExtensions.length > 0 && (
              <span>Accepted: {fileConfig.allowedExtensions.map((e) => `.${e}`).join(", ")}</span>
            )}
            <span>Max size: {maxSizeStr}</span>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className={`flex items-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-md text-sm font-medium text-gray-600 bg-white hover:bg-gray-50 cursor-pointer w-fit transition-colors ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Upload className="w-4 h-4" />
            Choose File
          </button>
        </div>
      )}

      {uploadState.status === "uploading" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Loader2 className="w-4 h-4 animate-spin text-academixPurpleDark" />
            <span className="font-medium">{uploadState.fileName}</span>
            <span className="text-gray-400">Uploading... {uploadState.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-academixPurpleDark h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadState.progress}%` }}
            />
          </div>
        </div>
      )}

      {uploadState.status === "uploaded" && (
        <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-md p-3">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">
              {uploadState.file.fileOriginalName}
            </p>
            <p className="text-xs text-gray-500">
              {formatFileSize(uploadState.file.fileSizeBytes)}
              {" · "}
              {getFileIcon(uploadState.file.fileMimeType)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!disabled && (
              <>
                <button
                  type="button"
                  onClick={handleReplaceClick}
                  className="flex items-center gap-1 text-xs text-academixPurpleDark hover:underline font-medium"
                >
                  <Replace className="w-3 h-3" />
                  Replace
                </button>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="flex items-center gap-1 text-xs text-red-500 hover:underline font-medium"
                >
                  <X className="w-3 h-3" />
                  Remove
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {uploadState.status === "removing" && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="w-4 h-4 animate-spin" />
          Removing file...
        </div>
      )}

      {uploadState.status === "error" && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-md p-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-700">
              {uploadState.fileName ? `Failed to upload "${uploadState.fileName}"` : "Upload failed"}
            </p>
            <p className="text-xs text-red-500">{uploadState.message}</p>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="shrink-0 text-xs text-academixPurpleDark hover:underline font-medium"
          >
            Try again
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled}
        accept={acceptedExtensions}
      />
    </div>
  );
}
