"use client";

import { updateStudentFinalGrade } from "@/lib/actions";
import { Pencil, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { toast } from "react-toastify";

type FinalGradeEditButtonProps = {
  studentId: string;
  studentName: string;
  academicYearId: number;
  averageScore: number | null;
};

const initialState = {
  success: false,
  error: false,
  message: "",
};

export default function FinalGradeEditButton({
  studentId,
  studentName,
  academicYearId,
  averageScore,
}: FinalGradeEditButtonProps) {
  const t = useTranslations("finalGradeEdit");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    updateStudentFinalGrade,
    initialState,
  );

  useEffect(() => {
    if (state.success) {
      toast.success(state.message || t("updated"));
      setOpen(false);
      router.refresh();
    } else if (state.error && state.message) {
      toast.error(state.message);
    }
  }, [router, state, t]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-academixPurpleDark text-white transition hover:scale-[1.05]"
        title={t("edit")}
      >
        <Pencil className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">{t("title")}</h2>
                <p className="mt-1 text-sm text-gray-500">{studentName}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                disabled={isPending}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form action={formAction} className="space-y-4">
              <input type="hidden" name="studentId" value={studentId} />
              <input
                type="hidden"
                name="academicYearId"
                value={academicYearId}
              />

              <label className="block text-sm font-medium text-gray-700">
                {t("finalGrade")}
                <input
                  name="averageScore"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  required
                  defaultValue={averageScore ?? ""}
                  className="mt-2 w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-academixPurpleDark focus:ring-2 focus:ring-academixPurple/40"
                />
              </label>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={isPending}
                  className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-md bg-academixPurpleDark px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {isPending ? t("saving") : t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
