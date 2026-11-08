"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { Loader2, Printer } from "lucide-react";
import { createAttendanceSheet, createResultSheet } from "@/lib/actions/entrySheet.actions";
import type { AssessmentRef } from "@/lib/entrySheets/classEntry";

type SheetRequest = { assessment: AssessmentRef } | { classId: number; date: string };

/** Saves the class list as a sheet, then opens it for printing. */
const PrintSheetButton = (request: SheetRequest) => {
  const t = useTranslations("entrySheet");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const create = () =>
    startTransition(async () => {
      const result =
        "assessment" in request
          ? await createResultSheet({
              assessmentType: request.assessment.type,
              assessmentId: request.assessment.id,
            })
          : await createAttendanceSheet({ classId: request.classId, date: request.date });
      if (result.success && result.sheetId) {
        router.push(`/list/entry-sheets/${result.sheetId}/print`);
      } else {
        toast.error(result.message);
      }
    });

  return (
    <button
      type="button"
      onClick={create}
      disabled={isPending}
      className="inline-flex items-center gap-2 bg-academixPurple disabled:opacity-60 px-3 py-2 rounded-md text-sm"
    >
      {isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
      ) : (
        <Printer className="w-4 h-4" aria-hidden />
      )}
      {isPending ? t("preparing") : t("printSheet")}
    </button>
  );
};

export default PrintSheetButton;
