import { describe, expect, it } from "vitest";
import {
  ROWS_PER_PAGE,
  SHEET_CODE_ALPHABET,
  buildSheetRows,
  newSheetCode,
  pageCount,
  rowsOnPage,
  sheetRowsSchema,
} from "./sheetRows";

const students = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: `s${index + 1}`, name: `طالب ${index + 1}` }));

describe("buildSheetRows", () => {
  it("numbers rows in the order given, starting at 1", () => {
    expect(buildSheetRows(students(2))).toEqual([
      { page: 1, rowNumber: 1, studentId: "s1", name: "طالب 1" },
      { page: 1, rowNumber: 2, studentId: "s2", name: "طالب 2" },
    ]);
  });

  it(`fits ${ROWS_PER_PAGE} students on one page`, () => {
    expect(pageCount(buildSheetRows(students(ROWS_PER_PAGE)))).toBe(1);
  });

  it("starts a second page for a class of 31", () => {
    const rows = buildSheetRows(students(31));

    expect(pageCount(rows)).toBe(2);
    expect(rows[30]).toEqual({ page: 2, rowNumber: 31, studentId: "s31", name: "طالب 31" });
  });

  it("keeps numbering across pages, so a row number names one student", () => {
    const rows = buildSheetRows(students(61));

    expect(rowsOnPage(rows, 3).map((row) => row.rowNumber)).toEqual([61]);
    expect(new Set(rows.map((row) => row.rowNumber)).size).toBe(61);
  });

  it("returns no rows for page numbers that don't exist", () => {
    expect(rowsOnPage(buildSheetRows(students(5)), 2)).toEqual([]);
  });
});

describe("newSheetCode", () => {
  it("makes a 6-character code from letters and digits that are hard to confuse", () => {
    const code = newSheetCode();

    expect(code).toMatch(/^[A-Z2-9]{6}$/);
    for (const confusable of ["0", "O", "1", "I", "L"]) {
      expect(SHEET_CODE_ALPHABET).not.toContain(confusable);
    }
  });

  it("uses the random source it is given", () => {
    expect(newSheetCode(() => 0)).toBe(SHEET_CODE_ALPHABET[0].repeat(6));
  });
});

describe("sheetRowsSchema", () => {
  it("reads rows saved by buildSheetRows", () => {
    const rows = buildSheetRows(students(3));

    expect(sheetRowsSchema.parse(JSON.parse(JSON.stringify(rows)))).toEqual(rows);
  });

  it.each([
    ["not a list", { page: 1 }],
    ["a row without a student", [{ page: 1, rowNumber: 1, name: "x" }]],
    ["a page of 0", [{ page: 0, rowNumber: 1, studentId: "s1", name: "x" }]],
  ])("rejects stored rows that are %s", (_label, value) => {
    expect(sheetRowsSchema.safeParse(value).success).toBe(false);
  });
});
