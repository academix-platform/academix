"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";
import { saveClassResults } from "@/lib/actions/entrySheet.actions";
import { TypedMark, readTypedMark } from "@/lib/entrySheets/markInput";
import type { ClassEntryRow, EntryAssessment } from "@/lib/entrySheets/classEntry";

type CheckedRow = ClassEntryRow & {
  mark: TypedMark;
  /** A typed mark would replace this student's existing result. */
  replaces: boolean;
};

const ClassEntryGrid = ({
  assessment,
  rows,
}: {
  assessment: EntryAssessment;
  rows: ClassEntryRow[];
}) => {
  const t = useTranslations("classEntry");
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [accepted, setAccepted] = useState<Record<string, boolean>>({});
  const [failedStudentId, setFailedStudentId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const checked: CheckedRow[] = rows.map((row) => {
    const mark = readTypedMark(values[row.studentId] ?? "", assessment.maxScore);
    return { ...row, mark, replaces: mark.kind === "mark" && row.existingScore !== null };
  });
  const ready = checked.filter((row) => row.mark.kind === "mark");
  const hasErrors = checked.some((row) => row.mark.kind === "error");
  const unaccepted = checked.some((row) => row.replaces && !accepted[row.studentId]);
  const blocker =
    ready.length === 0
      ? t("nothingToSave")
      : hasErrors
        ? t("fixErrors")
        : unaccepted
          ? t("acceptReplacements")
          : null;

  const save = () =>
    startTransition(async () => {
      const result = await saveClassResults({
        assessmentType: assessment.type,
        assessmentId: assessment.id,
        rows: ready.map((row) => ({
          studentId: row.studentId,
          score: row.mark.kind === "mark" ? row.mark.score : 0,
          replace: row.replaces && Boolean(accepted[row.studentId]),
        })),
      });
      if (result.success) {
        toast.success(t("saved", { count: result.savedCount ?? ready.length }));
        setValues({});
        setAccepted({});
        setFailedStudentId(null);
        router.refresh();
      } else {
        setFailedStudentId(result.studentId ?? null);
        toast.error(result.message);
      }
    });

  const errorText = (mark: TypedMark) =>
    mark.kind !== "error"
      ? null
      : mark.reason === "aboveMax"
        ? t("aboveMax", { max: assessment.maxScore })
        : t("notANumber");

  return (
    <div className="flex flex-col gap-4 mt-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[28rem] text-sm">
          <thead>
            <tr className="border-b text-gray-500 text-start">
              <th scope="col" className="p-2 w-10 font-medium text-start">#</th>
              <th scope="col" className="p-2 font-medium text-start">{t("student")}</th>
              <th scope="col" className="p-2 font-medium text-start">{t("currentMark")}</th>
              <th scope="col" className="p-2 w-44 font-medium text-start">{t("mark")}</th>
            </tr>
          </thead>
          <tbody>
            {checked.map((row, index) => {
              const error = errorText(row.mark);
              const errorId = `mark-error-${row.studentId}`;
              const failed = failedStudentId === row.studentId;
              return (
                <tr
                  key={row.studentId}
                  className={`border-b align-top ${failed || error ? "bg-red-50" : ""}`}
                >
                  <td className="p-2 text-gray-500">{index + 1}</td>
                  <td className="p-2">{row.name}</td>
                  <td className="p-2 text-gray-600">{row.existingScore ?? "—"}</td>
                  <td className="p-2">
                    <input
                      ref={(element) => {
                        inputs.current[index] = element;
                      }}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      value={values[row.studentId] ?? ""}
                      onChange={(event) =>
                        setValues((prev) => ({ ...prev, [row.studentId]: event.target.value }))
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          inputs.current[index + 1]?.focus();
                        }
                      }}
                      aria-label={t("markFor", { name: row.name })}
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? errorId : undefined}
                      className="p-2 border rounded-md w-24 aria-[invalid=true]:border-red-500"
                    />
                    {error && (
                      <p id={errorId} className="mt-1 text-red-700 text-xs">
                        {error}
                      </p>
                    )}
                    {row.replaces && (
                      <label className="flex items-center gap-2 mt-1 text-amber-800 text-xs">
                        <input
                          type="checkbox"
                          checked={Boolean(accepted[row.studentId])}
                          onChange={(event) =>
                            setAccepted((prev) => ({ ...prev, [row.studentId]: event.target.checked }))
                          }
                        />
                        {t("replaceExisting", { score: row.existingScore ?? "" })}
                      </label>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={Boolean(blocker) || isPending}
          className="bg-academixPurpleDark disabled:opacity-60 px-4 py-2 rounded-md text-white text-sm disabled:cursor-not-allowed"
        >
          <span className="inline-flex items-center gap-2">
            {isPending && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
            {isPending ? t("saving") : t("save")}
          </span>
        </button>
        <p className="text-gray-600 text-sm" role="status">
          {blocker ?? t("readyCount", { count: ready.length })}
        </p>
      </div>
    </div>
  );
};

export default ClassEntryGrid;
