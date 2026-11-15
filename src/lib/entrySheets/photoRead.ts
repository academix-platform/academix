// Checks an uploaded sheet photo and matches Gemini's reply to the sheet
// whose code it read. No I/O here, so the rules can be unit-tested.

import type { SheetReply } from "@/lib/ai/sheetReadingPrompt";
import { SheetRow, pageCount, rowsOnPage } from "./sheetRows";

/** The browser shrinks photos first; this keeps requests under Vercel's 4.5 MB. */
export const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

export type PhotoMimeType = "image/jpeg" | "image/png" | "image/webp";

const startsWith = (bytes: Uint8Array, prefix: number[], offset = 0) =>
  prefix.every((value, index) => bytes[offset + index] === value);

const ascii = (text: string) => [...text].map((char) => char.charCodeAt(0));

/** Identifies the photo by its first bytes. The name and stated type prove nothing. */
export const checkPhoto = (
  bytes: Uint8Array,
): { mimeType: PhotoMimeType } | { error: "notAPhoto" | "tooLarge" } => {
  if (bytes.length > MAX_PHOTO_BYTES) return { error: "tooLarge" };
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { mimeType: "image/jpeg" };
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mimeType: "image/png" };
  if (startsWith(bytes, ascii("RIFF")) && startsWith(bytes, ascii("WEBP"), 8)) return { mimeType: "image/webp" };
  return { error: "notAPhoto" };
};

export type CandidateSheet = { id: string; code: string; rows: SheetRow[] };

export type PhotoReadRow = {
  studentId: string;
  rowNumber: number;
  /** The name printed on the sheet. */
  name: string;
  /** The name Gemini read on the photo. */
  printedName: string;
  written: string;
  score: number | null;
  unclear: boolean;
  /** Attendance only: true for any mark, false for an empty box, null when unclear. */
  absent: boolean | null;
};

/** Every row number on any candidate sheet, for checking the reply. */
export const rowNumbersOf = (sheets: CandidateSheet[]) =>
  [...new Set(sheets.flatMap((sheet) => sheet.rows.map((row) => row.rowNumber)))].sort((a, b) => a - b);

const normalizeCode = (code: string) => code.replace(/[\s-]/g, "").toUpperCase();

/**
 * Finds the sheet and page the photo shows and maps its rows to students.
 * A reply that would put a value on a row of another page is refused whole.
 */
export const matchReplyToSheet = (
  reply: SheetReply,
  sheets: CandidateSheet[],
):
  | { error: "wrongSheet" | "rowsMismatch" }
  | {
      sheetId: string;
      code: string;
      page: number;
      pageCount: number;
      /** Everyone printed on the sheet, on all pages. */
      sheetStudents: { studentId: string; name: string }[];
      rows: PhotoReadRow[];
    } => {
  const sheet = sheets.find((candidate) => candidate.code === normalizeCode(reply.sheetCode));
  const pageRows = sheet ? rowsOnPage(sheet.rows, reply.pageNumber) : [];
  if (!sheet || pageRows.length === 0) return { error: "wrongSheet" };

  const onPage = new Set(pageRows.map((row) => row.rowNumber));
  // The parser fills rows it didn't see with empty placeholders; only rows
  // with something read on them can be on the wrong page.
  const strayRow = reply.rows.some(
    (row) => !onPage.has(row.rowNumber) && (row.printedName !== "" || row.written !== ""),
  );
  if (strayRow) return { error: "rowsMismatch" };

  const read = new Map(reply.rows.map((row) => [row.rowNumber, row]));
  return {
    sheetId: sheet.id,
    code: sheet.code,
    page: reply.pageNumber,
    pageCount: pageCount(sheet.rows),
    sheetStudents: sheet.rows.map((row) => ({ studentId: row.studentId, name: row.name })),
    rows: pageRows.map((row) => {
      const found = read.get(row.rowNumber);
      return {
        studentId: row.studentId,
        rowNumber: row.rowNumber,
        name: row.name,
        printedName: found?.printedName ?? "",
        written: found?.written ?? "",
        score: found?.score ?? null,
        unclear: found ? found.unclear : true,
        absent: found ? found.absent : null,
      };
    }),
  };
};
