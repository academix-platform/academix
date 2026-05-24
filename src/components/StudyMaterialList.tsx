"use client";

import { useActionState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  FileText,
  FileImage,
  File,
  Download,
  Trash2,
  Loader2,
  BookOpen,
} from "lucide-react";
import {
  deleteStudyMaterial,
  StudyMaterialState,
} from "@/lib/actions/studyMaterial.actions";

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
    return <FileImage className="w-8 h-8 text-blue-400" />;
  if (type === "pdf") return <FileText className="w-8 h-8 text-red-400" />;
  return <File className="w-8 h-8 text-gray-400" />;
}

const badgeColors: Record<string, string> = {
  pdf: "bg-red-100 text-red-700",
  doc: "bg-blue-100 text-blue-700",
  docx: "bg-blue-100 text-blue-700",
  ppt: "bg-orange-100 text-orange-700",
  pptx: "bg-orange-100 text-orange-700",
  xls: "bg-green-100 text-green-700",
  xlsx: "bg-green-100 text-green-700",
  png: "bg-purple-100 text-purple-700",
  jpg: "bg-purple-100 text-purple-700",
  jpeg: "bg-purple-100 text-purple-700",
  zip: "bg-yellow-100 text-yellow-700",
};

// ─── Delete button ────────────────────────────────────────────────────────────
// مكون منفصل حتى لا يتشارك الـ state مع باقي العناصر
function DeleteButton({ id, subjectId }: { id: number; subjectId: number }) {
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
        title="Delete"
        className="hover:bg-red-50 disabled:opacity-40 p-1.5 rounded-lg text-gray-400 hover:text-red-500 transition-colors"
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
  if (materials.length === 0) {
    return (
      <div className="bg-white shadow-sm p-10 border border-gray-100 rounded-xl text-center">
        <BookOpen className="mx-auto mb-3 w-10 h-10 text-gray-200" />
        <p className="font-medium text-gray-500">No study materials yet</p>
        <p className="mt-1 text-gray-400 text-sm">
          {role === "teacher"
            ? "Upload the first material using the form on the right."
            : "Your teacher hasn't uploaded any materials yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-6 py-4 border-gray-100 border-b">
        <BookOpen className="w-5 h-5 text-purple-500" />
        <h2 className="font-semibold text-gray-800 text-base">
          Study Materials
        </h2>
        <span className="ml-1 text-gray-400 text-sm">({materials.length})</span>
      </div>

      <ul className="divide-y divide-gray-50">
        {materials.map((m) => {
          const isOwner =
            role === "admin" ||
            (role === "teacher" && currentUserId === m.teacher.id);

          return (
            <li
              key={m.id}
              className="flex items-start gap-4 hover:bg-gray-50 px-6 py-4 transition-colors"
            >
              {/* أيقونة نوع الملف */}
              <div className="flex-shrink-0 mt-0.5">
                <FileIcon type={m.fileType} />
              </div>

              {/* المعلومات */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-gray-800 truncate">
                    {m.title}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full uppercase
                    ${badgeColors[m.fileType] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {m.fileType}
                  </span>
                </div>

                {m.description && (
                  <p className="mt-0.5 text-gray-500 text-sm line-clamp-2">
                    {m.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-gray-400 text-xs">
                  <span>{m.teacher.name}</span>
                  <span>·</span>
                  <span>
                    {new Date(m.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  <span>·</span>
                  <span className="max-w-[140px] truncate">{m.fileName}</span>
                </div>
              </div>

              {/* أزرار الإجراءات */}
              <div className="flex flex-shrink-0 items-center gap-1">
                {/* تحميل — لجميع المستخدمين */}
                <a
                  href={`/api/download/${m.id}?type=studyMaterial`}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={m.fileName}
                  title="Download"
                  className="hover:bg-purple-50 p-1.5 rounded-lg text-gray-400 hover:text-purple-600 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </a>

                {/* حذف — للمعلم صاحب الملف فقط */}
                {isOwner && <DeleteButton id={m.id} subjectId={subjectId} />}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
