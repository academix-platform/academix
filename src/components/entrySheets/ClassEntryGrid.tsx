"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";
import { saveClassResults } from "@/lib/actions/entrySheet.actions";
import { readTypedMark } from "@/lib/entrySheets/markInput";
import type { ClassEntryRow as Row, EntryAssessment } from "@/lib/entrySheets/classEntry";
import type { PhotoReadRow } from "@/lib/entrySheets/photoRead";
import { RowDecision, departedStudents, isRowHandled, resultRowFlags } from "@/lib/entrySheets/rowFlags";
import ClassEntryRow from "./ClassEntryRow";
import PhotoPanel, { SheetPhoto } from "./PhotoPanel";
import PhotoUpload, { PhotoRead } from "./PhotoUpload";

type ReadSheet = { pages: number[]; pageCount: number; students: { studentId: string; name: string }[] };

const ClassEntryGrid = ({ assessment, rows }: { assessment: EntryAssessment; rows: Row[] }) => {
  const t = useTranslations("classEntry");
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [edited, setEdited] = useState<Record<string, boolean>>({});
  const [decisions, setDecisions] = useState<Record<string, RowDecision>>({});
  const [failedStudentId, setFailedStudentId] = useState<string | null>(null);
  const [photoRows, setPhotoRows] = useState<Record<string, PhotoReadRow>>({});
  const [readSheets, setReadSheets] = useState<Record<string, ReadSheet>>({});
  const [photos, setPhotos] = useState<SheetPhoto[]>([]);
  const [isPending, startTransition] = useTransition();
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  // Photo copies live only in this tab's memory; free them when leaving.
  const photoUrls = useRef<string[]>([]);
  useEffect(() => () => photoUrls.current.forEach((url) => URL.revokeObjectURL(url)), []);

  const fillFromPhoto = (read: PhotoRead, photo: Blob) => {
    const key = `${read.code}:${read.page}`;
    const url = URL.createObjectURL(photo);
    photoUrls.current.push(url);
    setPhotos((prev) => [...prev.filter((shown) => shown.key !== key), { key, page: read.page, url }]);
    setReadSheets((prev) => ({
      ...prev,
      [read.code]: {
        pages: [...new Set([...(prev[read.code]?.pages ?? []), read.page])].sort((a, b) => a - b),
        pageCount: read.pageCount,
        students: read.sheetStudents,
      },
    }));

    const onScreen = new Set(rows.map((row) => row.studentId));
    const found = read.rows.filter((row) => onScreen.has(row.studentId));
    const byStudent = <T,>(pick: (row: PhotoReadRow) => T) =>
      Object.fromEntries(found.map((row) => [row.studentId, pick(row)]));
    setPhotoRows((prev) => ({ ...prev, ...byStudent((row) => row) }));
    setValues((prev) => ({ ...prev, ...byStudent((row) => (row.score === null ? "" : String(row.score))) }));
    setEdited((prev) => ({ ...prev, ...byStudent(() => false) }));
    // A new read replaces earlier decisions on the same rows.
    const foundIds = new Set(found.map((row) => row.studentId));
    setDecisions((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => !foundIds.has(id))));
    toast.success(
      t("photoFilled", { page: read.page, total: read.pageCount, count: found.filter((row) => row.score !== null).length }),
    );
  };

  const sheetStudents = Object.values(readSheets).flatMap((sheet) => sheet.students);
  const onSheetIds = sheetStudents.length > 0 ? new Set(sheetStudents.map((student) => student.studentId)) : null;
  const checked = rows.map((row) => {
    const mark = readTypedMark(values[row.studentId] ?? "", assessment.maxScore);
    const flags = resultRowFlags({
      typed: mark,
      existingScore: row.existingScore,
      maxScore: assessment.maxScore,
      read: photoRows[row.studentId],
      onSheet: onSheetIds ? onSheetIds.has(row.studentId) : null,
    });
    const decision = decisions[row.studentId];
    const handled = isRowHandled(flags, { decision, edited: Boolean(edited[row.studentId]) });
    return { row, mark, flags, decision, handled, skipped: decision === "skip" };
  });

  const toSave = checked.filter((item) => !item.skipped && item.mark.kind === "mark");
  const unhandled = checked.filter((item) => !item.handled).length;
  const hasErrors = checked.some((item) => !item.skipped && item.mark.kind === "error");
  const blocker = hasErrors
    ? t("fixErrors")
    : unhandled > 0
      ? t("checkRows", { count: unhandled })
      : toSave.length === 0
        ? t("nothingToSave")
        : null;
  const departed = departedStudents(sheetStudents, rows.map((row) => row.studentId));

  const save = () =>
    startTransition(async () => {
      const result = await saveClassResults({
        assessmentType: assessment.type,
        assessmentId: assessment.id,
        rows: toSave.map((item) => ({
          studentId: item.row.studentId,
          score: item.mark.kind === "mark" ? item.mark.score : 0,
          // Only reachable after the row's replacement was accepted.
          replace: item.flags.includes("replacesExisting"),
        })),
      });
      if (!result.success) {
        setFailedStudentId(result.studentId ?? null);
        toast.error(result.message);
        return;
      }
      toast.success(t("saved", { count: result.savedCount ?? toSave.length }));
      for (const reset of [setValues, setEdited, setDecisions, setPhotoRows, setReadSheets]) reset({});
      setPhotos([]);
      setFailedStudentId(null);
      router.refresh();
    });

  const table = (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] text-sm">
        <thead>
          <tr className="border-b text-gray-500">
            <th scope="col" className="p-2 w-10 font-medium text-start">#</th>
            <th scope="col" className="p-2 font-medium text-start">{t("student")}</th>
            <th scope="col" className="p-2 font-medium text-start">{t("currentMark")}</th>
            <th scope="col" className="p-2 w-48 font-medium text-start">{t("mark")}</th>
          </tr>
        </thead>
        <tbody>
          {checked.map((item, index) => (
            <ClassEntryRow
              key={item.row.studentId}
              index={index}
              row={item.row}
              value={values[item.row.studentId] ?? ""}
              mark={item.mark}
              maxScore={assessment.maxScore}
              flags={item.flags}
              decision={item.decision}
              handled={item.handled}
              read={photoRows[item.row.studentId]}
              failed={failedStudentId === item.row.studentId}
              inputRef={(element) => {
                inputs.current[index] = element;
              }}
              onValue={(value) => {
                setValues((prev) => ({ ...prev, [item.row.studentId]: value }));
                setEdited((prev) => ({ ...prev, [item.row.studentId]: true }));
              }}
              onDecision={(decision) =>
                setDecisions((prev) => {
                  const { [item.row.studentId]: _old, ...rest } = prev;
                  return decision ? { ...rest, [item.row.studentId]: decision } : rest;
                })
              }
              onEnter={() => inputs.current[index + 1]?.focus()}
            />
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 mt-4">
      <PhotoUpload assessment={{ type: assessment.type, id: assessment.id }} onRead={fillFromPhoto} />

      {Object.entries(readSheets).map(([code, sheet]) => (
        <p key={code} className="text-gray-700 text-sm">
          {t("pagesRead", { code, pages: sheet.pages.join(", "), total: sheet.pageCount })}
        </p>
      ))}
      {departed.length > 0 && (
        <p className="bg-amber-50 px-3 py-2 rounded-md text-amber-900 text-sm">
          {t("departed", { names: departed.map((student) => student.name).join("، ") })}
        </p>
      )}

      {photos.length > 0 ? (
        <div className="lg:items-start gap-4 grid lg:grid-cols-2">
          <PhotoPanel photos={photos} />
          {table}
        </div>
      ) : (
        table
      )}

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
          {blocker ?? t("readyCount", { count: toSave.length })}
        </p>
      </div>
    </div>
  );
};

export default ClassEntryGrid;
