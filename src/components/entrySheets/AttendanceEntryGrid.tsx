"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "react-toastify";
import { readAttendanceSheetPhoto } from "@/lib/actions/entrySheet.actions";
import type { AttendanceEntryRow as Row } from "@/lib/entrySheets/attendanceSheet";
import type { PhotoReadRow } from "@/lib/entrySheets/photoRead";
import {
  RowDecision,
  attendanceRowFlags,
  departedStudents,
  isRowHandled,
  needsNoAbsenceConfirmation,
  presentFromRead,
} from "@/lib/entrySheets/rowFlags";
import AttendanceEntryRow from "./AttendanceEntryRow";
import PhotoPanel, { SheetPhoto } from "./PhotoPanel";
import PhotoUpload, { PhotoRead } from "./PhotoUpload";

type ReadSheet = { pages: number[]; pageCount: number; students: { studentId: string; name: string }[] };
type ReadPage = { key: string; page: number; noAbsences: boolean };

const without = <T,>(record: Record<string, T>, ids: Set<string>) =>
  Object.fromEntries(Object.entries(record).filter(([id]) => !ids.has(id)));

/**
 * The check-and-fix screen for one attendance sheet. Rows are filled from
 * photos only: direct attendance for today stays on the attendance page.
 */
const AttendanceEntryGrid = ({ classId, date, rows }: { classId: number; date: string; rows: Row[] }) => {
  const t = useTranslations("attendanceSheet");
  const [present, setPresent] = useState<Record<string, boolean>>({});
  const [edited, setEdited] = useState<Record<string, boolean>>({});
  const [decisions, setDecisions] = useState<Record<string, RowDecision>>({});
  const [photoRows, setPhotoRows] = useState<Record<string, PhotoReadRow>>({});
  const [readSheets, setReadSheets] = useState<Record<string, ReadSheet>>({});
  const [readPages, setReadPages] = useState<ReadPage[]>([]);
  const [confirmed, setConfirmed] = useState<Record<string, boolean>>({});
  const [photos, setPhotos] = useState<SheetPhoto[]>([]);

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
    setReadPages((prev) => [
      ...prev.filter((page) => page.key !== key),
      { key, page: read.page, noAbsences: needsNoAbsenceConfirmation(read.rows) },
    ]);
    setConfirmed(({ [key]: _old, ...rest }) => rest);

    const onScreen = new Set(rows.map((row) => row.studentId));
    const found = read.rows.filter((row) => onScreen.has(row.studentId));
    const foundIds = new Set(found.map((row) => row.studentId));
    const readValues = Object.fromEntries(
      found.flatMap((row) => {
        const value = presentFromRead(row);
        return value === undefined ? [] : [[row.studentId, value]];
      }),
    );
    setPhotoRows((prev) => ({ ...prev, ...Object.fromEntries(found.map((row) => [row.studentId, row])) }));
    // A new read replaces earlier values, edits and decisions on the same rows.
    setPresent((prev) => ({ ...without(prev, foundIds), ...readValues }));
    setEdited((prev) => without(prev, foundIds));
    setDecisions((prev) => without(prev, foundIds));
    toast.success(
      t("photoFilled", {
        page: read.page,
        total: read.pageCount,
        count: found.filter((row) => row.absent === true).length,
      }),
    );
  };

  const sheetStudents = Object.values(readSheets).flatMap((sheet) => sheet.students);
  const onSheetIds = sheetStudents.length > 0 ? new Set(sheetStudents.map((student) => student.studentId)) : null;
  const checked = rows.map((row) => {
    const value = present[row.studentId];
    const flags = attendanceRowFlags({
      read: photoRows[row.studentId],
      onSheet: onSheetIds ? onSheetIds.has(row.studentId) : null,
      existingPresent: row.existingPresent,
      present: value,
    });
    const decision = decisions[row.studentId];
    const handled = isRowHandled(flags, { decision, edited: Boolean(edited[row.studentId]) });
    return { row, value, flags, decision, handled, skipped: decision === "skip" };
  });

  const toSave = checked.filter((item) => !item.skipped && item.value !== undefined);
  const unhandled = checked.filter((item) => !item.handled).length;
  const unconfirmed = readPages.filter((page) => page.noAbsences && !confirmed[page.key]);
  const blocker =
    readPages.length === 0
      ? t("uploadFirst")
      : unhandled > 0
        ? t("checkRows", { count: unhandled })
        : unconfirmed.length > 0
          ? t("confirmPages")
          : toSave.length === 0
            ? t("nothingToSave")
            : null;
  const departed = departedStudents(sheetStudents, rows.map((row) => row.studentId));

  const table = (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] text-sm">
        <thead>
          <tr className="border-b text-gray-500">
            <th scope="col" className="p-2 w-10 font-medium text-start">#</th>
            <th scope="col" className="p-2 font-medium text-start">{t("student")}</th>
            <th scope="col" className="p-2 font-medium text-start">{t("savedStatus")}</th>
            <th scope="col" className="p-2 w-56 font-medium text-start">{t("status")}</th>
          </tr>
        </thead>
        <tbody>
          {checked.map((item, index) => (
            <AttendanceEntryRow
              key={item.row.studentId}
              index={index}
              row={item.row}
              present={item.value}
              flags={item.flags}
              decision={item.decision}
              handled={item.handled}
              read={photoRows[item.row.studentId]}
              failed={false}
              locked={readPages.length === 0}
              onPresent={(value) => {
                setPresent((prev) => ({ ...prev, [item.row.studentId]: value }));
                setEdited((prev) => ({ ...prev, [item.row.studentId]: true }));
              }}
              onDecision={(decision) =>
                setDecisions((prev) => {
                  const { [item.row.studentId]: _old, ...rest } = prev;
                  return decision ? { ...rest, [item.row.studentId]: decision } : rest;
                })
              }
            />
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 mt-4">
      <PhotoUpload
        fields={{ classId: String(classId), date }}
        read={readAttendanceSheetPhoto}
        messages="attendanceSheet"
        onRead={fillFromPhoto}
      />

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
      {readPages
        .filter((page) => page.noAbsences)
        .map((page) => (
          <label
            key={page.key}
            className="flex items-start gap-2 bg-amber-50 px-3 py-2 rounded-md text-amber-900 text-sm"
          >
            <input
              type="checkbox"
              className="mt-1"
              checked={Boolean(confirmed[page.key])}
              onChange={(event) => setConfirmed((prev) => ({ ...prev, [page.key]: event.target.checked }))}
            />
            <span>{t("noAbsencesConfirm", { page: page.page })}</span>
          </label>
        ))}

      {photos.length > 0 ? (
        <div className="lg:items-start gap-4 grid lg:grid-cols-2">
          <PhotoPanel photos={photos} />
          {table}
        </div>
      ) : (
        table
      )}

      <p className="text-gray-600 text-sm" role="status">
        {blocker ?? t("readyCount", { count: toSave.length })}
      </p>
    </div>
  );
};

export default AttendanceEntryGrid;
