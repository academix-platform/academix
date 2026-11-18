import "server-only";

import { PdfNotSupportedError } from "@/lib/ai/geminiModel";
import { InvalidPeopleReplyError, type PeopleReply, type PeopleReplyRow } from "@/lib/ai/peopleReadingPrompt";
import { MAX_PHOTO_BYTES, checkPhoto } from "@/lib/entrySheets/photoRead";
import { markPageReadsSucceeded, reservePageReads, type ReadLogDb } from "@/lib/entrySheets/readLimit";

import type { ImportKind } from "./columns";
import { MAX_PDF_BYTES, MAX_PDF_PAGES } from "./fileCheck";
import { countPdfPages, isPdf } from "./pdfPages";

// Reading the people in an uploaded photo or PDF. The file is checked by its
// own bytes, each page is counted toward the school's daily read limit before
// Gemini is paid for, and the file is never stored: it lives in memory for
// the length of this call. What Gemini returns is only rows of text for the
// review screen, where every check runs as it does for a spreadsheet.

export type PeopleFileType = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

export type ReadFileProblem =
  | "notSupported"
  | "tooLarge"
  | "pdfTooLarge"
  | "tooManyPages"
  | "pdfUnreadable"
  | "pdfNotSupported"
  | "dailyLimit"
  | "unreadable"
  | "noRows"
  | "unavailable";

/** What kind of file the bytes are, and how many pages they count for. */
export const inspectPeopleFile = (
  bytes: Uint8Array,
): { ok: true; mimeType: PeopleFileType; pages: number } | { ok: false; problem: ReadFileProblem } => {
  if (isPdf(bytes)) {
    if (bytes.length > MAX_PDF_BYTES) return { ok: false, problem: "pdfTooLarge" };
    const pages = countPdfPages(bytes);
    if (pages === null) return { ok: false, problem: "pdfUnreadable" };
    if (pages > MAX_PDF_PAGES) return { ok: false, problem: "tooManyPages" };
    return { ok: true, mimeType: "application/pdf", pages };
  }
  if (bytes.length > MAX_PHOTO_BYTES) return { ok: false, problem: "tooLarge" };
  const photo = checkPhoto(bytes);
  if ("error" in photo) return { ok: false, problem: photo.error === "tooLarge" ? "tooLarge" : "notSupported" };
  return { ok: true, mimeType: photo.mimeType, pages: 1 };
};

export type ReadFileDeps = {
  db: ReadLogDb;
  /** Has Gemini read the file. Throws InvalidPeopleReplyError for a reply that can't be used. */
  read: (input: { file: Buffer; mimeType: PeopleFileType; kind: ImportKind }) => Promise<{ reply: PeopleReply }>;
  model: string;
  /** The school's page limit for the day, shared with sheet reads. */
  limit: number;
  now?: Date;
};

/**
 * Reads one uploaded photo or PDF for the admin's school and returns its
 * rows. Errors are logged by name only: never the file or what was read.
 */
export const readPeopleFileWith = async (
  deps: ReadFileDeps,
  schoolId: number,
  kind: ImportKind,
  bytes: Uint8Array,
): Promise<{ ok: true; rows: PeopleReplyRow[]; pages: number } | { ok: false; problem: ReadFileProblem }> => {
  const inspected = inspectPeopleFile(bytes);
  if (!inspected.ok) return inspected;

  // Count the pages before paying for them, so a failed read still counts.
  let reservation;
  try {
    reservation = await reservePageReads(deps.db, {
      schoolId,
      model: deps.model,
      limit: deps.limit,
      pages: inspected.pages,
      now: deps.now,
    });
  } catch (err) {
    console.error("readPeopleFile: read log failed", err instanceof Error ? err.name : "unknown error");
    return { ok: false, problem: "unavailable" };
  }
  if (!reservation.allowed) return { ok: false, problem: "dailyLimit" };

  let reply: PeopleReply;
  try {
    ({ reply } = await deps.read({ file: Buffer.from(bytes), mimeType: inspected.mimeType, kind }));
  } catch (err) {
    if (err instanceof InvalidPeopleReplyError) return { ok: false, problem: "unreadable" };
    if (err instanceof PdfNotSupportedError) return { ok: false, problem: "pdfNotSupported" };
    console.error("readPeopleFile: Gemini call failed", err instanceof Error ? err.name : "unknown error");
    return { ok: false, problem: "unavailable" };
  }
  if (!reply.readable) return { ok: false, problem: "unreadable" };
  if (reply.rows.length === 0) return { ok: false, problem: "noRows" };

  // The read already worked, so a failed status update only loses the status.
  await markPageReadsSucceeded(deps.db, reservation.readIds).catch((err) =>
    console.error("readPeopleFile: read log update failed", err instanceof Error ? err.name : "unknown error"),
  );

  return { ok: true, rows: reply.rows, pages: inspected.pages };
};
