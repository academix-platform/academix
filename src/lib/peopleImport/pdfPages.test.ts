import { deflateSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { countPdfPages, isPdf } from "./pdfPages";

const bytes = (text: string) => new Uint8Array(Buffer.from(text, "latin1"));

const page = (number: number) => `${number} 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\n`;

/** A small PDF with its page objects written out in the open. */
const plainPdf = (pages: number, trailer = "") =>
  bytes(
    `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n` +
      `2 0 obj\n<< /Type /Pages /Count ${pages} /Kids [] >>\nendobj\n` +
      Array.from({ length: pages }, (_, i) => page(i + 3)).join("") +
      `trailer\n<< /Root 1 0 R ${trailer}>>\n%%EOF`,
  );

/** A PDF 1.5 file whose page objects sit inside a compressed object stream. */
const compressedPdf = (pages: number) => {
  const objects = Array.from({ length: pages }, () => "<</Type/Page/Parent 2 0 R>>").join(" ");
  const packed = deflateSync(Buffer.from(objects, "latin1"));
  return new Uint8Array(
    Buffer.concat([
      Buffer.from(`%PDF-1.5\n5 0 obj\n<< /Type /ObjStm /N ${pages} /First 10 /Filter /FlateDecode /Length ${packed.length} >>\nstream\n`, "latin1"),
      packed,
      Buffer.from("\nendstream\nendobj\n%%EOF", "latin1"),
    ]),
  );
};

describe("isPdf", () => {
  it("knows a PDF by its first bytes, not its name", () => {
    expect(isPdf(plainPdf(1))).toBe(true);
    expect(isPdf(bytes("PK\u0003\u0004 not a pdf"))).toBe(false);
    expect(isPdf(new Uint8Array())).toBe(false);
  });
});

describe("countPdfPages", () => {
  it("counts the pages of a plain PDF", () => {
    expect(countPdfPages(plainPdf(1))).toBe(1);
    expect(countPdfPages(plainPdf(10))).toBe(10);
    expect(countPdfPages(plainPdf(11))).toBe(11);
  });

  it("does not count the page tree itself as a page", () => {
    expect(countPdfPages(plainPdf(2))).toBe(2);
  });

  it("counts pages kept in compressed object streams", () => {
    expect(countPdfPages(compressedPdf(3))).toBe(3);
    expect(countPdfPages(compressedPdf(12))).toBe(12);
  });

  it("can't count a file that isn't a PDF", () => {
    expect(countPdfPages(bytes("just text with /Type /Page in it"))).toBeNull();
  });

  it("can't count an encrypted PDF, whose pages are hidden", () => {
    expect(countPdfPages(plainPdf(2, "/Encrypt 9 0 R "))).toBeNull();
  });

  it("can't count a PDF with no pages it can find", () => {
    expect(countPdfPages(bytes("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF"))).toBeNull();
  });

  it("survives a broken compressed stream", () => {
    const broken = bytes("%PDF-1.5\n5 0 obj\n<< /Type /ObjStm /Filter /FlateDecode >>\nstream\nnot deflate data\nendstream\nendobj\n" + page(6));
    expect(countPdfPages(broken)).toBe(1);
  });
});
