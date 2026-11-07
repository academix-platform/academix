import { z } from "zod";

// The rows printed on an entry sheet. Row numbers run on across pages, so a
// row number alone identifies one student on the whole sheet.

/** Up to 30 rows fit on A4 with enough room to write; see sample-sheets.html. */
export const ROWS_PER_PAGE = 30;

export const sheetRowSchema = z.object({
  page: z.number().int().positive(),
  rowNumber: z.number().int().positive(),
  studentId: z.string().min(1),
  name: z.string(),
});
export const sheetRowsSchema = z.array(sheetRowSchema);
export type SheetRow = z.infer<typeof sheetRowSchema>;

export const buildSheetRows = (students: { id: string; name: string }[]): SheetRow[] =>
  students.map((student, index) => ({
    page: Math.floor(index / ROWS_PER_PAGE) + 1,
    rowNumber: index + 1,
    studentId: student.id,
    name: student.name,
  }));

export const pageCount = (rows: SheetRow[]) =>
  rows.reduce((pages, row) => Math.max(pages, row.page), 0);

export const rowsOnPage = (rows: SheetRow[], page: number) =>
  rows.filter((row) => row.page === page);

// No 0/O, 1/I/L, so the printed code reads the same to people and to Gemini.
export const SHEET_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

const randomIndex = (size: number) => {
  const [value] = crypto.getRandomValues(new Uint32Array(1));
  return value % size;
};

export const newSheetCode = (random: (size: number) => number = randomIndex) =>
  Array.from(
    { length: CODE_LENGTH },
    () => SHEET_CODE_ALPHABET[random(SHEET_CODE_ALPHABET.length)],
  ).join("");
