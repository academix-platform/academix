import { describe, expect, it } from "vitest";
import type { SheetReply } from "@/lib/ai/sheetReadingPrompt";
import { MAX_PHOTO_BYTES, checkPhoto, matchReplyToSheet, rowNumbersOf } from "./photoRead";
import { buildSheetRows } from "./sheetRows";

const bytes = (...values: number[]) => new Uint8Array([...values, ...new Array(16).fill(0)]);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const WEBP = new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP"), 0, 0, 0, 0]);

describe("checkPhoto", () => {
  it.each([
    ["JPEG", JPEG, "image/jpeg"],
    ["PNG", PNG, "image/png"],
    ["WebP", WEBP, "image/webp"],
  ])("accepts a %s photo by its contents", (_label, photo, mimeType) => {
    expect(checkPhoto(photo)).toEqual({ mimeType });
  });

  it("refuses a file that only claims to be a photo", () => {
    expect(checkPhoto(new Uint8Array(Buffer.from("%PDF-1.7 not a photo")))).toEqual({
      error: "notAPhoto",
    });
  });

  it("refuses an empty file", () => {
    expect(checkPhoto(new Uint8Array())).toEqual({ error: "notAPhoto" });
  });

  it("refuses a photo over the size limit, which keeps requests under Vercel's 4.5 MB", () => {
    const large = new Uint8Array(MAX_PHOTO_BYTES + 1);
    large.set([0xff, 0xd8, 0xff]);

    expect(MAX_PHOTO_BYTES).toBeLessThan(4.5 * 1024 * 1024);
    expect(checkPhoto(large)).toEqual({ error: "tooLarge" });
  });
});

const names = (count: number) =>
  Array.from({ length: count }, (_, index) => ({ id: `s${index + 1}`, name: `طالب ${index + 1}` }));

const sheet = (code: string, count: number) => ({ id: `sheet-${code}`, code, rows: buildSheetRows(names(count)) });

const replyRow = (rowNumber: number, written: string, score: number | null, fields = {}) => ({
  rowNumber,
  printedName: `طالب ${rowNumber}`,
  written,
  unclear: false,
  score,
  absent: null,
  ...fields,
});

const reply = (fields: Partial<SheetReply>): SheetReply => ({
  readable: true,
  sheetCode: "K7QX3M",
  pageNumber: 1,
  rows: [replyRow(1, "15", 15), replyRow(2, "", null)],
  ...fields,
});

describe("rowNumbersOf", () => {
  it("covers every row of every sheet, so any page can be checked", () => {
    expect(rowNumbersOf([sheet("AAAAAA", 2), sheet("BBBBBB", 3)])).toEqual([1, 2, 3]);
  });
});

describe("matchReplyToSheet", () => {
  it("maps each read row to the student printed on it", () => {
    expect(matchReplyToSheet(reply({}), [sheet("K7QX3M", 2)])).toEqual({
      sheetId: "sheet-K7QX3M",
      code: "K7QX3M",
      page: 1,
      pageCount: 1,
      sheetStudents: [
        { studentId: "s1", name: "طالب 1" },
        { studentId: "s2", name: "طالب 2" },
      ],
      rows: [
        { studentId: "s1", rowNumber: 1, name: "طالب 1", printedName: "طالب 1", written: "15", score: 15, unclear: false },
        { studentId: "s2", rowNumber: 2, name: "طالب 2", printedName: "طالب 2", written: "", score: null, unclear: false },
      ],
    });
  });

  it("lists every student printed on the sheet, on all pages", () => {
    const matched = matchReplyToSheet(reply({}), [sheet("K7QX3M", 31)]);

    expect("sheetStudents" in matched && matched.sheetStudents).toHaveLength(31);
    expect("sheetStudents" in matched && matched.sheetStudents[30]).toEqual({ studentId: "s31", name: "طالب 31" });
  });

  it("finds the sheet whatever the spacing or case of the read code", () => {
    expect(matchReplyToSheet(reply({ sheetCode: "k7q x3m" }), [sheet("K7QX3M", 2)])).toMatchObject({
      code: "K7QX3M",
    });
  });

  it("picks the sheet the code names, among several printed for one assessment", () => {
    const sheets = [sheet("AAAAAA", 2), sheet("K7QX3M", 2)];

    expect(matchReplyToSheet(reply({}), sheets)).toMatchObject({ sheetId: "sheet-K7QX3M" });
  });

  it("stops at a code that isn't one of this assessment's sheets", () => {
    expect(matchReplyToSheet(reply({ sheetCode: "ZZZZZZ" }), [sheet("K7QX3M", 2)])).toEqual({
      error: "wrongSheet",
    });
  });

  it("stops at a page the sheet doesn't have", () => {
    expect(matchReplyToSheet(reply({ pageNumber: 2 }), [sheet("K7QX3M", 2)])).toEqual({
      error: "wrongSheet",
    });
  });

  it("fills only the rows on the photographed page", () => {
    const rows = [replyRow(31, "9", 9)];
    const matched = matchReplyToSheet(reply({ pageNumber: 2, rows }), [sheet("K7QX3M", 31)]);

    expect(matched).toMatchObject({ page: 2, pageCount: 2 });
    expect("rows" in matched && matched.rows.map((row) => row.studentId)).toEqual(["s31"]);
  });

  it("refuses a reply with values on rows printed on another page", () => {
    const rows = [replyRow(1, "15", 15), replyRow(31, "9", 9)];

    expect(matchReplyToSheet(reply({ rows }), [sheet("K7QX3M", 31)])).toEqual({ error: "rowsMismatch" });
  });

  it("ignores the empty placeholders the parser adds for other pages' rows", () => {
    const placeholder = { ...replyRow(31, "", null), printedName: "", unclear: true };
    const rows = [replyRow(1, "15", 15), placeholder];

    expect(matchReplyToSheet(reply({ rows }), [sheet("K7QX3M", 31)])).toMatchObject({ page: 1 });
  });

  it("returns a row the photo missed as unclear, so it can't pass unnoticed", () => {
    const matched = matchReplyToSheet(reply({ rows: [replyRow(1, "15", 15)] }), [sheet("K7QX3M", 2)]);

    expect("rows" in matched && matched.rows[1]).toMatchObject({ studentId: "s2", unclear: true, score: null });
  });
});
