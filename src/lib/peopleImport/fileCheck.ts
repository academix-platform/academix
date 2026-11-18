// Which uploaded files the people import accepts. Checked in the browser
// before reading, so a wrong file gets a clear message straight away.

export type ImportFileType = "xlsx" | "csv" | "photo" | "pdf";

export type ImportFileProblem = "xls" | "unsupported" | "tooBig" | "pdfTooBig" | "empty" | "unreadable";

/** Larger than any school's list of people, small enough to read in the browser quickly. */
export const MAX_SPREADSHEET_BYTES = 10 * 1024 * 1024;

/** Rows read from one file. A school's whole year fits; the review screen stays usable. */
export const MAX_IMPORT_ROWS = 2000;

const TYPES: Record<string, ImportFileType> = {
  xlsx: "xlsx",
  csv: "csv",
  jpg: "photo",
  jpeg: "photo",
  png: "photo",
  webp: "photo",
  pdf: "pdf",
};

/** What the file picker offers. The server decides the real type from the file's bytes. */
export const IMPORT_FILE_ACCEPT = ".xlsx,.csv,.jpg,.jpeg,.png,.webp,.pdf";

export const checkImportFile = ({
  name,
  size,
}: {
  name: string;
  size: number;
}): { ok: true; type: ImportFileType } | { ok: false; problem: ImportFileProblem } => {
  const extension = name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";
  if (extension === "xls") return { ok: false, problem: "xls" };
  const type = TYPES[extension];
  if (!type) return { ok: false, problem: "unsupported" };
  if (size === 0) return { ok: false, problem: "empty" };
  // A photo is shrunk in the browser before it is sent, so its size here doesn't matter.
  if (type === "pdf" && size > MAX_PDF_BYTES) return { ok: false, problem: "pdfTooBig" };
  if ((type === "xlsx" || type === "csv") && size > MAX_SPREADSHEET_BYTES) return { ok: false, problem: "tooBig" };
  return { ok: true, type };
};

/**
 * The problem behind a failed read. read-excel-file throws
 * XLS_FILE_NOT_SUPPORTED for an old .xls file, even one renamed to .xlsx.
 * Source: https://gitlab.com/catamphetamine/read-excel-file/-/raw/master/README.md
 */
export const readErrorProblem = (err: unknown): ImportFileProblem =>
  typeof err === "object" && err !== null && (err as { code?: unknown }).code === "XLS_FILE_NOT_SUPPORTED"
    ? "xls"
    : "unreadable";

/** A PDF can be at most 4 MB, which also keeps the upload under Vercel's 4.5 MB request limit. */
export const MAX_PDF_BYTES = 4 * 1024 * 1024;

/** A PDF can have at most 10 pages. Each page counts toward the school's daily read limit. */
export const MAX_PDF_PAGES = 10;
