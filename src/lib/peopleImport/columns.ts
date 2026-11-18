// Reading a spreadsheet's columns. The browser reads the cells and describes
// each column with counts and shares only, so the values never leave it:
// the column reader receives the headers and these descriptions, never names,
// IDs or phone numbers. No SDK calls here, so the rules can be unit-tested.

import { z } from "zod";

import { toWesternDigits } from "@/lib/entrySheets/digits";

import { checkNationalId } from "./nationalId";

export type ImportKind = "students" | "teachers";

const STUDENT_FIELDS = [
  "studentName",
  "nationalId",
  "className",
  "sex",
  "birthday",
  "bloodType",
  "address",
  "studentPhone",
  "studentEmail",
  "parentName",
  "parentPhone",
  "parentEmail",
] as const;

const TEACHER_FIELDS = ["teacherName", "email", "phone", "sex", "birthday", "bloodType", "address", "subjects"] as const;

export type StudentField = (typeof STUDENT_FIELDS)[number];
export type TeacherField = (typeof TEACHER_FIELDS)[number];
export type PersonField = StudentField | TeacherField;
export type ColumnChoice = PersonField | "unknown";

export const fieldsFor = (kind: ImportKind): readonly PersonField[] =>
  kind === "students" ? STUDENT_FIELDS : TEACHER_FIELDS;

/** Names are often split over several columns, such as first name and family name. */
export const NAME_FIELDS: ReadonlySet<PersonField> = new Set(["studentName", "parentName", "teacherName"]);

const PHONE_FIELDS: ReadonlySet<PersonField> = new Set(["studentPhone", "parentPhone", "phone"]);

/** What a column holds, as counts and shares of its filled cells (0 to 100). Never a value. */
export type ColumnDescription = {
  index: number;
  header: string;
  filled: number;
  empty: number;
  distinct: number;
  digits: number;
  shortestDigits: number;
  longestDigits: number;
  nationalIds: number;
  phones: number;
  dates: number;
  emails: number;
  bloodTypes: number;
  arabicText: number;
  latinText: number;
  averageWords: number;
};

export const MAX_HEADER_LENGTH = 60;
export const MAX_COLUMNS = 60;

/** Checks descriptions sent from the browser: a header and numbers, nothing else. */
const share = z.number().int().min(0).max(100);
const count = z.number().int().min(0).max(1_000_000);
export const columnDescriptionsSchema = z
  .array(
    z
      .object({
        index: z.number().int().min(0).max(MAX_COLUMNS - 1),
        header: z.string().max(MAX_HEADER_LENGTH),
        filled: count,
        empty: count,
        distinct: count,
        digits: share,
        shortestDigits: count,
        longestDigits: count,
        nationalIds: share,
        phones: share,
        dates: share,
        emails: share,
        bloodTypes: share,
        arabicText: share,
        latinText: share,
        averageWords: z.number().int().min(0).max(100),
      })
      .strict(),
  )
  .min(1)
  .max(MAX_COLUMNS)
  .refine((columns) => columns.every((column, position) => column.index === position), {
    message: "Columns must be in order.",
  });

type CellKind = "empty" | "date" | "email" | "nationalId" | "phone" | "digits" | "bloodType" | "arabic" | "latin" | "other";

const DATE_TEXT = /^(\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Palestinian and Israeli mobiles: 05 and 8 digits, with or without the leading
// zero Excel drops from numbers, or with the country code.
const PHONE = /^(?:\+?97[02]|0097[02])?0?5\d{8}$/;
// 8 digits too, since Excel drops an ID's leading zero. Shorter numbers, such
// as row numbers, would pass the check once padded, so they never count.
const ID_LENGTH = /^\d{8,9}$/;
const BLOOD_TYPE = /^(A|B|AB|O)\s*[+-]$/i;
const ARABIC_LETTER = /[ء-ي]/;
const LATIN_LETTER = /[A-Za-z]/;

/** A cell as text, with Western digits. Whole numbers are written without exponents. */
export const cellText = (cell: unknown): string => {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) return Number.isNaN(cell.getTime()) ? "" : cell.toISOString().slice(0, 10);
  if (typeof cell === "number") return Number.isInteger(cell) ? cell.toFixed(0) : String(cell);
  return toWesternDigits(String(cell)).trim();
};

const kindOf = (cell: unknown): CellKind => {
  if (cell instanceof Date) return "date";
  const text = cellText(cell);
  if (!text) return "empty";
  if (DATE_TEXT.test(text)) return "date";
  if (EMAIL.test(text)) return "email";
  // Checked before phones: a phone without its 0 is 9 digits starting with 5,
  // like many IDs. Only about 1 in 10 such phones passes the check digit.
  if (ID_LENGTH.test(text) && checkNationalId(text).ok) return "nationalId";
  if (PHONE.test(text.replace(/[\s-]/g, ""))) return "phone";
  if (/^\d+$/.test(text)) return "digits";
  if (BLOOD_TYPE.test(text)) return "bloodType";
  if (ARABIC_LETTER.test(text)) return "arabic";
  if (LATIN_LETTER.test(text)) return "latin";
  return "other";
};

const percent = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 100));

/** A header that looks like a value means the file has no header row, so it isn't sent. */
const safeHeader = (cell: unknown) => {
  const kind = kindOf(cell);
  if (kind === "date" || kind === "email" || kind === "nationalId" || kind === "phone" || kind === "digits" || kind === "bloodType") return "";
  return cellText(cell).replace(/\s+/g, " ").slice(0, MAX_HEADER_LENGTH);
};

/** Describes each column of the data rows, using the header row for names. */
export const describeColumns = (headerRow: unknown[], dataRows: unknown[][]): ColumnDescription[] => {
  const width = Math.min(
    MAX_COLUMNS,
    Math.max(headerRow.length, ...dataRows.map((row) => row.length), 0),
  );

  return Array.from({ length: width }, (_, index) => {
    const cells = dataRows.map((row) => row[index]);
    const kinds = cells.map(kindOf);
    const filledCells = cells.filter((_, i) => kinds[i] !== "empty");
    const filled = filledCells.length;
    const countOf = (kind: CellKind) => kinds.filter((k) => k === kind).length;
    const digitLengths = cells.filter((_, i) => kinds[i] === "digits").map((cell) => cellText(cell).length);
    const textCells = cells.filter((_, i) => kinds[i] === "arabic" || kinds[i] === "latin").map(cellText);
    const words = textCells.reduce((sum, text) => sum + text.split(/\s+/).length, 0);

    return {
      index,
      header: safeHeader(headerRow[index]),
      filled,
      empty: cells.length - filled,
      distinct: new Set(filledCells.map(cellText)).size,
      digits: percent(countOf("digits"), filled),
      shortestDigits: digitLengths.length ? Math.min(...digitLengths) : 0,
      longestDigits: digitLengths.length ? Math.max(...digitLengths) : 0,
      nationalIds: percent(countOf("nationalId"), filled),
      phones: percent(countOf("phone"), filled),
      dates: percent(countOf("date"), filled),
      emails: percent(countOf("email"), filled),
      bloodTypes: percent(countOf("bloodType"), filled),
      arabicText: percent(countOf("arabic"), filled),
      latinText: percent(countOf("latin"), filled),
      averageWords: textCells.length ? Math.round(words / textCells.length) : 0,
    };
  });
};

/**
 * The header row: among the first rows, the one with the most filled text
 * cells. Title rows above it, such as the school's name, have fewer.
 */
export const findHeaderRow = (sheet: unknown[][], lookAhead = 10): number => {
  let best = 0;
  let bestCount = -1;
  sheet.slice(0, lookAhead).forEach((row, index) => {
    const textCells = row.filter((cell) => {
      const kind = kindOf(cell);
      return kind === "arabic" || kind === "latin" || kind === "other";
    }).length;
    if (textCells > bestCount) {
      best = index;
      bestCount = textCells;
    }
  });
  return best;
};

export type ImportedRow = {
  /** The row's number in the spreadsheet, so the admin can find it. */
  sourceRow: number;
  values: Partial<Record<PersonField, string>>;
};

const fieldValue = (field: PersonField, cell: unknown) => {
  const text = cellText(cell);
  // Excel stores a phone typed as a number without its leading zero.
  if (PHONE_FIELDS.has(field) && /^5\d{8}$/.test(text)) return `0${text}`;
  return text;
};

/**
 * Reads each data row's fields from the columns the admin chose. Name parts
 * are joined in column order. Empty cells are left out, so they can never
 * replace existing data. Rows with nothing in the chosen columns are skipped.
 */
export const applyColumnMapping = (
  dataRows: unknown[][],
  mapping: ColumnChoice[],
  firstRowNumber = 2,
): ImportedRow[] =>
  dataRows.flatMap((row, i) => {
    const values: Partial<Record<PersonField, string>> = {};
    mapping.forEach((field, column) => {
      if (field === "unknown") return;
      const text = fieldValue(field, row[column]);
      if (!text) return;
      if (NAME_FIELDS.has(field) && values[field]) values[field] = `${values[field]} ${text}`;
      else values[field] ??= text;
    });
    return Object.keys(values).length ? [{ sourceRow: firstRowNumber + i, values }] : [];
  });
