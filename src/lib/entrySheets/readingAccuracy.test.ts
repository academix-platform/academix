import { describe, expect, it } from "vitest";
import type { SheetReplyRow } from "@/lib/ai/sheetReadingPrompt";
import { compareSheet, summarizeSheets } from "./readingAccuracy";

const resultRow = (
  rowNumber: number,
  written: string,
  score: number | null,
  fields: Partial<SheetReplyRow> = {},
): SheetReplyRow => ({
  rowNumber,
  printedName: `طالب ${rowNumber}`,
  written,
  unclear: false,
  score,
  absent: null,
  ...fields,
});

const attendanceRow = (
  rowNumber: number,
  absent: boolean | null,
  fields: Partial<SheetReplyRow> = {},
): SheetReplyRow => ({
  rowNumber,
  printedName: `طالب ${rowNumber}`,
  written: absent ? "x" : "",
  unclear: absent === null,
  score: null,
  absent,
  ...fields,
});

const expected = (...values: string[]) =>
  values.map((value, index) => ({
    rowNumber: index + 1,
    name: `طالب ${index + 1}`,
    value,
  }));

describe("compareSheet on results", () => {
  it("counts a matching mark as correct, whatever digit style the answer uses", () => {
    const result = compareSheet("RESULT", expected("١٥"), [resultRow(1, "15", 15)]);

    expect(result).toMatchObject({ total: 1, correct: 1, unclear: 0, wrongValues: [] });
  });

  it("counts an empty box read as empty as correct", () => {
    const result = compareSheet("RESULT", expected(""), [resultRow(1, "", null)]);

    expect(result.correct).toBe(1);
  });

  it("lists a misread mark with what was expected and what was read", () => {
    const result = compareSheet("RESULT", expected("15"), [resultRow(1, "10", 10)]);

    expect(result.correct).toBe(0);
    expect(result.wrongValues).toEqual([{ rowNumber: 1, expected: "15", read: "10" }]);
  });

  it("counts an unclear row apart from a wrong one, because it was not misread", () => {
    const rows = [resultRow(1, "", null, { unclear: true })];
    const result = compareSheet("RESULT", expected("15"), rows);

    expect(result).toMatchObject({ correct: 0, unclear: 1, wrongValues: [] });
  });

  it("counts a row the reply left out as unclear", () => {
    const result = compareSheet("RESULT", expected("15"), []);

    expect(result).toMatchObject({ total: 1, correct: 0, unclear: 1 });
  });

  it("scores a value the answer expects to be unclear", () => {
    const rows = [resultRow(1, "", null, { unclear: true })];

    expect(compareSheet("RESULT", expected("?"), rows).correct).toBe(1);
  });

  it("lists a confident read of a value the answer expects to be unclear as wrong", () => {
    const result = compareSheet("RESULT", expected("?"), [resultRow(1, "15", 15)]);

    expect(result.wrongValues).toEqual([{ rowNumber: 1, expected: "?", read: "15" }]);
  });
});

describe("compareSheet on attendance", () => {
  it("counts a marked box on an absent student as correct", () => {
    const result = compareSheet("ATTENDANCE", expected("x"), [attendanceRow(1, true)]);

    expect(result).toMatchObject({ correct: 1, missedAbsences: [] });
  });

  it("counts an empty box on a present student as correct", () => {
    const result = compareSheet("ATTENDANCE", expected(""), [attendanceRow(1, false)]);

    expect(result.correct).toBe(1);
  });

  it("records an absence read as present as a missed absence", () => {
    const result = compareSheet("ATTENDANCE", expected("x"), [attendanceRow(1, false)]);

    expect(result.missedAbsences).toEqual([1]);
  });

  it("doesn't call an unclear box a missed absence, because a person decides it", () => {
    const result = compareSheet("ATTENDANCE", expected("x"), [attendanceRow(1, null)]);

    expect(result).toMatchObject({ unclear: 1, missedAbsences: [] });
  });

  it("lists a present student read as absent as a wrong value", () => {
    const result = compareSheet("ATTENDANCE", expected(""), [attendanceRow(1, true)]);

    expect(result.wrongValues).toHaveLength(1);
    expect(result.missedAbsences).toEqual([]);
  });
});

describe("compareSheet wrong rows", () => {
  it("flags a row whose printed name was read as another student", () => {
    const rows = [resultRow(1, "15", 15, { printedName: "طالب 2" })];
    const result = compareSheet("RESULT", expected("15"), rows);

    expect(result.wrongRows).toEqual([{ rowNumber: 1, reason: "name", read: "طالب 2" }]);
  });

  it("flags a mark that landed on the row next to where it was written", () => {
    const rows = [resultRow(1, "9", 9), resultRow(2, "", null)];
    const result = compareSheet("RESULT", expected("", "9"), rows);

    expect(result.wrongRows).toEqual([{ rowNumber: 1, reason: "neighbour", read: "9" }]);
  });

  it("flags an absence that landed on the neighbouring row", () => {
    const rows = [attendanceRow(1, false), attendanceRow(2, true)];
    const result = compareSheet("ATTENDANCE", expected("x", ""), rows);

    expect(result.wrongRows).toEqual([{ rowNumber: 2, reason: "neighbour", read: "x" }]);
  });

  it.each([
    ["spacing", "طالب  1"],
    ["vowel marks", "طَالب 1"],
    ["hamza forms", "طالب 1".replace("ا", "أ")],
  ])("doesn't flag a name that only differs in %s", (_label, printedName) => {
    const rows = [resultRow(1, "15", 15, { printedName })];

    expect(compareSheet("RESULT", expected("15"), rows).wrongRows).toEqual([]);
  });

  it("doesn't flag a skipped row, which is already unclear", () => {
    expect(compareSheet("RESULT", expected("15"), []).wrongRows).toEqual([]);
  });
});

describe("summarizeSheets", () => {
  const clean = {
    total: 100,
    correct: 95,
    unclear: 5,
    wrongValues: [],
    wrongRows: [],
    missedAbsences: [],
  };

  it("adds up all sheets into one accuracy figure", () => {
    const summary = summarizeSheets([clean, { ...clean, correct: 85, unclear: 15 }]);

    expect(summary).toMatchObject({ total: 200, correct: 180, unclear: 20, accuracy: 90 });
  });

  it("meets the target at exactly 95% with no wrong rows or missed absences", () => {
    expect(summarizeSheets([clean]).meetsTarget).toBe(true);
  });

  it("misses the target below 95%", () => {
    const summary = summarizeSheets([{ ...clean, correct: 94, unclear: 6 }]);

    expect(summary.meetsTarget).toBe(false);
  });

  it("misses the target on a single wrong row, even at 100%", () => {
    const wrongRows = [{ rowNumber: 1, reason: "name" as const, read: "طالب 2" }];
    const summary = summarizeSheets([{ ...clean, correct: 100, unclear: 0, wrongRows }]);

    expect(summary).toMatchObject({ wrongRows: 1, meetsTarget: false });
  });

  it("misses the target on a single missed absence, even at 100%", () => {
    const summary = summarizeSheets([
      { ...clean, correct: 100, unclear: 0, missedAbsences: [3] },
    ]);

    expect(summary).toMatchObject({ missedAbsences: 1, meetsTarget: false });
  });

  it("doesn't claim success with nothing to measure", () => {
    expect(summarizeSheets([])).toMatchObject({ accuracy: 0, meetsTarget: false });
  });
});
