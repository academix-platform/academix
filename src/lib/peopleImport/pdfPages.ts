import "server-only";
import { inflateSync } from "node:zlib";

// Counting a PDF's pages on the server, without a PDF library, so each page
// can be counted toward the school's daily read limit and the 10-page cap
// can't be dodged by the browser. The count is of page objects, which sit
// either in the open or inside compressed object streams (PDF 1.5 and later).
// A leftover page from an earlier save may be counted too: the count can be
// a little high, never low for a normal file. A PDF whose pages can't be
// found, such as an encrypted one, isn't counted and is refused.

/** The most text one object stream may unpack to, so a crafted file can't fill memory. */
const MAX_UNPACKED_BYTES = 20 * 1024 * 1024;

const PAGE_OBJECT = /\/Type\s*\/Page(?![A-Za-z])/g;
const STREAM = /stream\r?\n/g;

/** True when the bytes start as a PDF does. The name and stated type prove nothing. */
export const isPdf = (bytes: Uint8Array) => Buffer.from(bytes.subarray(0, 5)).toString("latin1") === "%PDF-";

const pagesIn = (text: string) => text.match(PAGE_OBJECT)?.length ?? 0;

/** The number of pages, or null when this isn't a PDF whose pages can be counted. */
export const countPdfPages = (bytes: Uint8Array): number | null => {
  if (!isPdf(bytes)) return null;
  const buffer = Buffer.from(bytes);
  const text = buffer.toString("latin1");
  if (/\/Encrypt\b/.test(text)) return null;

  let pages = pagesIn(text);

  // Object streams hold many objects, pages among them, packed with deflate.
  for (const match of text.matchAll(STREAM)) {
    const start = match.index + match[0].length;
    if (!/\/ObjStm\b/.test(text.slice(Math.max(0, start - 400), start))) continue;
    const end = text.indexOf("endstream", start);
    if (end === -1) continue;
    try {
      const unpacked = inflateSync(buffer.subarray(start, end), { maxOutputLength: MAX_UNPACKED_BYTES });
      pages += pagesIn(unpacked.toString("latin1"));
    } catch {
      // Not deflate, or too large: its pages, if any, stay uncounted.
    }
  }

  return pages > 0 ? pages : null;
};
