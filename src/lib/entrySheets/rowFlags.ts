// Which rows on the class screen a person must check before saving.
// Safe to use in the browser; the server repeats the checks that protect data.

import type { TypedMark } from "./markInput";
import type { PhotoReadRow } from "./photoRead";

export type ResultFlag =
  | "unclear"
  | "nameMismatch"
  | "empty"
  | "aboveMax"
  | "notOnSheet"
  | "replacesExisting";

export type RowDecision = "accept" | "skip";

/** Removes differences that don't change who a name refers to. */
const normalizeName = (name: string) =>
  name
    .replace(/[\sـً-ْٰ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");

export const sameStudentName = (a: string, b: string) => normalizeName(a) === normalizeName(b);

export const resultRowFlags = ({
  typed,
  existingScore,
  maxScore,
  read,
  onSheet,
}: {
  typed: TypedMark;
  existingScore: number | null;
  maxScore: number;
  /** What a photo read on this student's row, if any. */
  read?: PhotoReadRow;
  /** False when a photo was read but this student wasn't on that sheet; null with no photo. */
  onSheet: boolean | null;
}): ResultFlag[] => {
  const flags: ResultFlag[] = [];
  if (read?.unclear) flags.push("unclear");
  if (read && read.printedName !== "" && !sameStudentName(read.printedName, read.name)) {
    flags.push("nameMismatch");
  }
  if (read && !read.unclear && read.written === "") flags.push("empty");
  if (read?.score != null && read.score > maxScore) flags.push("aboveMax");
  if (onSheet === false) flags.push("notOnSheet");
  if (existingScore !== null && typed.kind === "mark") flags.push("replacesExisting");
  return flags;
};

/** Typing a new value can't confirm who a row belongs to or approve a replacement. */
export const needsExplicitAccept = (flag: ResultFlag) =>
  flag === "nameMismatch" || flag === "replacesExisting";

/** A flagged row is handled once it is fixed, accepted, or skipped. */
export const isRowHandled = (
  flags: ResultFlag[],
  { decision, edited }: { decision?: RowDecision; edited: boolean },
) =>
  flags.length === 0 ||
  decision !== undefined ||
  (edited && !flags.some(needsExplicitAccept));

/** Students printed on a sheet who are no longer on the class screen. */
export const departedStudents = (
  sheetStudents: { studentId: string; name: string }[],
  screenStudentIds: string[],
) => {
  const onScreen = new Set(screenStudentIds);
  return sheetStudents.filter((student) => !onScreen.has(student.studentId));
};
