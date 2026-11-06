// Scores what Gemini read from a sheet against a person's correct answers.
// Used by the accuracy test, against the targets in the spec's success criteria.

import type { SheetKind, SheetReplyRow } from "@/lib/ai/sheetReadingPrompt";
import { parseWrittenNumber } from "./digits";

/** In an answer file: this box is doubtful, so the reader should flag it. */
export const UNCLEAR_ANSWER = "?";

const ACCURACY_TARGET = 95;

export type ExpectedRow = { rowNumber: number; name: string; value: string };
export type WrongValue = { rowNumber: number; expected: string; read: string };
export type WrongRow = {
  rowNumber: number;
  reason: "name" | "neighbour";
  read: string;
};

export type SheetComparison = {
  total: number;
  correct: number;
  unclear: number;
  wrongValues: WrongValue[];
  wrongRows: WrongRow[];
  missedAbsences: number[];
};

/** Removes the differences that don't change who a name refers to. */
const normalizeName = (name: string) =>
  name
    .replace(/[\sـً-ْٰ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه");

const expectedValue = (kind: SheetKind, value: string) =>
  kind === "RESULT" ? parseWrittenNumber(value) : value !== "";

const readValue = (kind: SheetKind, row: SheetReplyRow) =>
  kind === "RESULT" ? row.score : row.absent;

/** A filled-in value is one that could have been written on another row. */
const isFilledIn = (value: number | boolean | null) =>
  value !== null && value !== false;

export const compareSheet = (
  kind: SheetKind,
  expected: ExpectedRow[],
  readRows: SheetReplyRow[],
): SheetComparison => {
  const comparison: SheetComparison = {
    total: expected.length,
    correct: 0,
    unclear: 0,
    wrongValues: [],
    wrongRows: [],
    missedAbsences: [],
  };

  expected.forEach((answer, index) => {
    const row = readRows.find((r) => r.rowNumber === answer.rowNumber);
    const { rowNumber } = answer;

    if (row?.printedName && normalizeName(row.printedName) !== normalizeName(answer.name)) {
      comparison.wrongRows.push({ rowNumber, reason: "name", read: row.printedName });
    }

    if (answer.value === UNCLEAR_ANSWER) {
      if (!row || row.unclear) comparison.correct += 1;
      else comparison.wrongValues.push({ rowNumber, expected: answer.value, read: row.written });
      return;
    }
    if (!row || row.unclear) {
      comparison.unclear += 1;
      return;
    }

    const read = readValue(kind, row);
    const want = expectedValue(kind, answer.value);
    if (read === want) {
      comparison.correct += 1;
      return;
    }

    comparison.wrongValues.push({ rowNumber, expected: answer.value, read: row.written });
    if (kind === "ATTENDANCE" && want === true) {
      comparison.missedAbsences.push(rowNumber);
    }

    // Reading the names correctly doesn't prove the values stayed on their rows.
    const neighbours = [expected[index - 1], expected[index + 1]];
    const belongsNextDoor = neighbours.some(
      (neighbour) =>
        neighbour &&
        neighbour.value !== UNCLEAR_ANSWER &&
        expectedValue(kind, neighbour.value) === read,
    );
    if (isFilledIn(read) && belongsNextDoor) {
      comparison.wrongRows.push({ rowNumber, reason: "neighbour", read: row.written });
    }
  });

  return comparison;
};

export const summarizeSheets = (sheets: SheetComparison[]) => {
  const sum = (count: (sheet: SheetComparison) => number) =>
    sheets.reduce((total, sheet) => total + count(sheet), 0);

  const total = sum((sheet) => sheet.total);
  const correct = sum((sheet) => sheet.correct);
  const wrongRows = sum((sheet) => sheet.wrongRows.length);
  const missedAbsences = sum((sheet) => sheet.missedAbsences.length);

  return {
    total,
    correct,
    unclear: sum((sheet) => sheet.unclear),
    wrongValues: sum((sheet) => sheet.wrongValues.length),
    wrongRows,
    missedAbsences,
    accuracy: total === 0 ? 0 : Math.round((correct / total) * 1000) / 10,
    meetsTarget:
      total > 0 &&
      correct * 100 >= total * ACCURACY_TARGET &&
      wrongRows === 0 &&
      missedAbsences === 0,
  };
};
