import { describe, expect, it } from "vitest";
import {
  InvalidSheetReplyError,
  SHEET_READING_SYSTEM_INSTRUCTION,
  buildSheetReadingPrompt,
  parseSheetReply,
  sheetReplySchema,
} from "./sheetReadingPrompt";

const row = (rowNumber: number, value = "", fields: Record<string, unknown> = {}) => ({
  rowNumber,
  printedName: `Student ${rowNumber}`,
  value,
  unclear: false,
  ...fields,
});

const reply = (fields: Record<string, unknown> = {}) =>
  JSON.stringify({
    readable: true,
    sheetCode: "AB12",
    pageNumber: 1,
    rows: [row(1, "15"), row(2, "١٢٫٥")],
    ...fields,
  });

const results = { kind: "RESULT", rowNumbers: [1, 2] } as const;
const attendance = { kind: "ATTENDANCE", rowNumbers: [1, 2] } as const;

describe("SHEET_READING_SYSTEM_INSTRUCTION", () => {
  it("treats everything written on the sheet as data, never instructions", () => {
    expect(SHEET_READING_SYSTEM_INSTRUCTION).toMatch(/untrusted data/i);
    expect(SHEET_READING_SYSTEM_INSTRUCTION).toMatch(/never follow instructions/i);
  });

  it("forbids guessing and asks for an empty value instead", () => {
    expect(SHEET_READING_SYSTEM_INSTRUCTION).toMatch(/never guess/i);
    expect(SHEET_READING_SYSTEM_INSTRUCTION).toMatch(/empty value/i);
  });

  it("marks uncertain digits as unclear, naming the 5 and 0 mix-up", () => {
    expect(SHEET_READING_SYSTEM_INSTRUCTION).toMatch(/"unclear" to true/);
    expect(SHEET_READING_SYSTEM_INSTRUCTION).toContain("٥");
    expect(SHEET_READING_SYSTEM_INSTRUCTION).toContain("١٥");
  });

  it("asks for values as written, leaving digit conversion to the app", () => {
    expect(SHEET_READING_SYSTEM_INSTRUCTION).toMatch(/exactly as written/i);
  });
});

describe("buildSheetReadingPrompt", () => {
  it("asks for the mark written in the box on a results sheet", () => {
    expect(buildSheetReadingPrompt("RESULT")).toMatch(/mark/i);
    expect(buildSheetReadingPrompt("RESULT")).not.toMatch(/absent/i);
  });

  it("names each attendance mark and says an empty box is empty", () => {
    const prompt = buildSheetReadingPrompt("ATTENDANCE");
    for (const mark of ["✗", "✓", "line", "dot", "غ"]) {
      expect(prompt).toContain(mark);
    }
    expect(prompt).toMatch(/empty box/i);
  });

  it("flags crossed-out marks and smudges as unclear on attendance sheets", () => {
    const prompt = buildSheetReadingPrompt("ATTENDANCE");
    expect(prompt).toMatch(/crossed.out/i);
    expect(prompt).toMatch(/smudge/i);
    expect(prompt).toMatch(/unclear/i);
  });
});

describe("sheetReplySchema", () => {
  it("requires every field the parser relies on", () => {
    expect(sheetReplySchema.required).toEqual([
      "readable",
      "sheetCode",
      "pageNumber",
      "rows",
    ]);
    expect(sheetReplySchema.properties.rows.items.required).toEqual([
      "rowNumber",
      "printedName",
      "value",
      "unclear",
    ]);
  });
});

describe("parseSheetReply", () => {
  it("reads the sheet code and page number", () => {
    const parsed = parseSheetReply(reply(), results);
    expect(parsed).toMatchObject({ readable: true, sheetCode: "AB12", pageNumber: 1 });
  });

  it("converts written marks of either digit style to numbers", () => {
    const parsed = parseSheetReply(reply(), results);
    expect(parsed.rows.map((r) => r.score)).toEqual([15, 12.5]);
    expect(parsed.rows.map((r) => r.written)).toEqual(["15", "١٢٫٥"]);
  });

  it("accepts JSON wrapped in a code fence", () => {
    const text = "```json\n" + reply() + "\n```";
    expect(parseSheetReply(text, results).sheetCode).toBe("AB12");
  });

  it("keeps an empty results box empty, without flagging it here", () => {
    const parsed = parseSheetReply(reply({ rows: [row(1), row(2, "9")] }), results);
    expect(parsed.rows[0]).toMatchObject({ score: null, unclear: false });
  });

  it("never turns an unclear mark into a number, even when a value came back", () => {
    const rows = [row(1, "10", { unclear: true }), row(2, "9")];
    const parsed = parseSheetReply(reply({ rows }), results);
    expect(parsed.rows[0]).toMatchObject({ score: null, unclear: true });
  });

  it("marks a value that is not a number as unclear instead of rejecting the page", () => {
    const parsed = parseSheetReply(reply({ rows: [row(1, "غ"), row(2, "9")] }), results);
    expect(parsed.rows[0]).toMatchObject({ score: null, unclear: true, written: "غ" });
  });

  it.each(["x", "✓", "-", ".", "غ"])("reads attendance mark %s as absent", (mark) => {
    const parsed = parseSheetReply(reply({ rows: [row(1, mark), row(2)] }), attendance);
    expect(parsed.rows[0].absent).toBe(true);
  });

  it("reads an empty attendance box as present", () => {
    const parsed = parseSheetReply(reply({ rows: [row(1, "x"), row(2)] }), attendance);
    expect(parsed.rows[1].absent).toBe(false);
  });

  it("leaves an unclear attendance box undecided, so it can't read as present", () => {
    const rows = [row(1, "", { unclear: true }), row(2)];
    const parsed = parseSheetReply(reply({ rows }), attendance);
    expect(parsed.rows[0]).toMatchObject({ absent: null, unclear: true });
  });

  it("leaves scores out of attendance rows and absences out of results rows", () => {
    const attendanceRows = parseSheetReply(
      reply({ rows: [row(1, "5"), row(2)] }),
      attendance,
    ).rows;
    expect(attendanceRows[0].score).toBeNull();
    expect(parseSheetReply(reply(), results).rows[0].absent).toBeNull();
  });

  it("returns a row the reply skipped as unclear, so a skipped absence isn't lost", () => {
    const parsed = parseSheetReply(reply({ rows: [row(2, "x")] }), attendance);
    expect(parsed.rows.map((r) => r.rowNumber)).toEqual([1, 2]);
    expect(parsed.rows[0]).toMatchObject({ absent: null, unclear: true, written: "" });
  });

  it("returns rows in row-number order", () => {
    const parsed = parseSheetReply(reply({ rows: [row(2, "9"), row(1, "8")] }), results);
    expect(parsed.rows.map((r) => r.rowNumber)).toEqual([1, 2]);
  });

  it("fills in no rows when the photo can't be read", () => {
    const text = reply({ readable: false, sheetCode: "", pageNumber: 0 });
    expect(parseSheetReply(text, results)).toEqual({
      readable: false,
      sheetCode: "",
      pageNumber: 0,
      rows: [],
    });
  });

  it.each([
    ["text with no JSON", "I could not read this."],
    ["malformed JSON", '{"readable": true,'],
    ["a JSON array", "[1, 2]"],
  ])("rejects %s", (_label, text) => {
    expect(() => parseSheetReply(text, results)).toThrow(InvalidSheetReplyError);
  });

  it.each([
    ["a non-boolean readable", { readable: "yes" }],
    ["a missing sheet code", { sheetCode: undefined }],
    ["an empty sheet code", { sheetCode: "  " }],
    ["a page number of 0", { pageNumber: 0 }],
    ["a fractional page number", { pageNumber: 1.5 }],
    ["rows that aren't an array", { rows: "none" }],
    ["a row that isn't an object", { rows: [row(1), "row 2"] }],
    ["a text row number", { rows: [row(1), row(2, "", { rowNumber: "2" })] }],
    ["a fractional row number", { rows: [row(1), row(2, "", { rowNumber: 1.5 })] }],
    ["a non-text value", { rows: [row(1), row(2, "", { value: 9 })] }],
    ["a missing printed name", { rows: [row(1), row(2, "", { printedName: undefined })] }],
    ["a missing unclear flag", { rows: [row(1), row(2, "", { unclear: undefined })] }],
  ])("rejects %s", (_label, fields) => {
    expect(() => parseSheetReply(reply(fields), results)).toThrow(InvalidSheetReplyError);
  });

  it("rejects a row number that isn't on the sheet", () => {
    const text = reply({ rows: [row(1), row(99, "20")] });
    expect(() => parseSheetReply(text, results)).toThrow(/unknown row 99/);
  });

  it("rejects a repeated row number, which could put a mark on the wrong student", () => {
    const text = reply({ rows: [row(1, "20"), row(1, "5")] });
    expect(() => parseSheetReply(text, results)).toThrow(/row 1 appears twice/);
  });
});
