"use client";

import { useTranslations } from "next-intl";
import type { ClassEntryRow as Row } from "@/lib/entrySheets/classEntry";
import type { TypedMark } from "@/lib/entrySheets/markInput";
import type { PhotoReadRow } from "@/lib/entrySheets/photoRead";
import type { ResultFlag, RowDecision } from "@/lib/entrySheets/rowFlags";

const ClassEntryRow = ({
  index,
  row,
  value,
  mark,
  maxScore,
  flags,
  decision,
  handled,
  read,
  failed,
  inputRef,
  onValue,
  onDecision,
  onEnter,
}: {
  index: number;
  row: Row;
  value: string;
  mark: TypedMark;
  maxScore: number;
  flags: ResultFlag[];
  decision?: RowDecision;
  handled: boolean;
  read?: PhotoReadRow;
  failed: boolean;
  inputRef: (element: HTMLInputElement | null) => void;
  onValue: (value: string) => void;
  onDecision: (decision: RowDecision | undefined) => void;
  onEnter: () => void;
}) => {
  const t = useTranslations("classEntry");
  const skipped = decision === "skip";
  const error =
    mark.kind !== "error" || skipped
      ? null
      : mark.reason === "aboveMax"
        ? t("aboveMax", { max: maxScore })
        : t("notANumber");
  const errorId = `mark-error-${row.studentId}`;
  const flagsId = `mark-flags-${row.studentId}`;

  const flagText = (flag: ResultFlag) =>
    flag === "replacesExisting"
      ? t("flags.replacesExisting", { score: row.existingScore ?? "" })
      : flag === "nameMismatch"
        ? t("flags.nameMismatch", { name: read?.printedName ?? "" })
        : flag === "aboveMax"
          ? t("flags.aboveMax", { max: maxScore })
          : t(`flags.${flag}`);

  const background = !handled
    ? "bg-amber-50"
    : skipped
      ? "opacity-60"
      : failed || error
        ? "bg-red-50"
        : "";

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
      <td className="p-2 text-gray-600">{row.existingScore ?? "—"}</td>
      <td className="p-2">
        <input
          ref={inputRef}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          disabled={skipped}
          onChange={(event) => onValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onEnter();
            }
          }}
          aria-label={t("markFor", { name: row.name })}
          aria-invalid={Boolean(error)}
          aria-describedby={[error ? errorId : "", flags.length ? flagsId : ""].join(" ").trim() || undefined}
          className="disabled:bg-gray-100 p-2 border rounded-md w-24 aria-[invalid=true]:border-red-500"
        />
        {error && (
          <p id={errorId} className="mt-1 text-red-700 text-xs">
            {error}
          </p>
        )}
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
              (["accept", "skip"] as const).map((choice) => (
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

export default ClassEntryRow;
