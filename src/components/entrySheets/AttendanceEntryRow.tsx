"use client";

import { useTranslations } from "next-intl";
import type { AttendanceEntryRow as Row } from "@/lib/entrySheets/attendanceSheet";
import type { PhotoReadRow } from "@/lib/entrySheets/photoRead";
import type { AttendanceFlag, RowDecision } from "@/lib/entrySheets/rowFlags";

const AttendanceEntryRow = ({
  index,
  row,
  present,
  flags,
  decision,
  handled,
  read,
  failed,
  locked,
  onPresent,
  onDecision,
}: {
  index: number;
  row: Row;
  present: boolean | undefined;
  flags: AttendanceFlag[];
  decision?: RowDecision;
  handled: boolean;
  read?: PhotoReadRow;
  failed: boolean;
  /** No photo has been read yet, so nothing can be marked. */
  locked: boolean;
  onPresent: (present: boolean) => void;
  onDecision: (decision: RowDecision | undefined) => void;
}) => {
  const t = useTranslations("attendanceSheet");
  const skipped = decision === "skip";
  const flagsId = `attendance-flags-${row.studentId}`;
  const status = (value: boolean | null | undefined) =>
    value === true ? t("present") : value === false ? t("absent") : "—";

  const flagText = (flag: AttendanceFlag) =>
    flag === "replacesExisting"
      ? t("flags.replacesExisting", { value: status(row.existingPresent) })
      : flag === "nameMismatch"
        ? t("flags.nameMismatch", { name: read?.printedName ?? "" })
        : t(`flags.${flag}`);

  const background = !handled ? "bg-amber-50" : skipped ? "opacity-60" : failed ? "bg-red-50" : "";

  return (
    <tr className={`border-b align-top ${background}`}>
      <td className="p-2 text-gray-500">{read?.rowNumber ?? index + 1}</td>
      <td className="p-2">
        {row.name}
        {flags.length > 0 && (
          <ul id={flagsId} className="mt-1 text-amber-800 text-xs list-disc list-inside">
            {flags.map((flag) => (
              <li key={flag}>{flagText(flag)}</li>
            ))}
          </ul>
        )}
      </td>
      <td className="p-2 text-gray-600">{status(row.existingPresent)}</td>
      <td className="p-2">
        <div
          role="group"
          aria-label={t("statusFor", { name: row.name })}
          aria-describedby={flags.length ? flagsId : undefined}
          className="inline-flex border rounded-md overflow-hidden"
        >
          {([true, false] as const).map((value) => (
            <button
              key={String(value)}
              type="button"
              disabled={skipped || locked}
              aria-pressed={present === value}
              onClick={() => onPresent(value)}
              className={`px-3 py-1 text-sm disabled:cursor-not-allowed ${
                present === value
                  ? value
                    ? "bg-green-600 text-white"
                    : "bg-red-600 text-white"
                  : "bg-white"
              }`}
            >
              {value ? t("present") : t("absent")}
            </button>
          ))}
        </div>
        {flags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
            {decision ? (
              <>
                <span className="text-gray-700">{t(decision === "accept" ? "accepted" : "skipped")}</span>
                <button type="button" onClick={() => onDecision(undefined)} className="underline">
                  {t("undo")}
                </button>
              </>
            ) : (
              // Accepting a row with no value would save nothing, so only skip is offered.
              (present === undefined ? (["skip"] as const) : (["accept", "skip"] as const)).map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => onDecision(choice)}
                  aria-label={t(`${choice}For`, { name: row.name })}
                  className="bg-white px-2 py-1 border rounded-md"
                >
                  {t(choice)}
                </button>
              ))
            )}
          </div>
        )}
      </td>
    </tr>
  );
};

export default AttendanceEntryRow;
