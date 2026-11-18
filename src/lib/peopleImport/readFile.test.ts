import { afterEach, describe, expect, it, vi } from "vitest";

import { InvalidPeopleReplyError, type PeopleReply } from "@/lib/ai/peopleReadingPrompt";
import { MAX_PHOTO_BYTES } from "@/lib/entrySheets/photoRead";
import type { ReadLogDb } from "@/lib/entrySheets/readLimit";

import { MAX_PDF_BYTES, MAX_PDF_PAGES } from "./fileCheck";
import { inspectPeopleFile, readPeopleFileWith, type ReadFileDeps } from "./readFile";

const SCHOOL = 1;
const NOW = new Date("2026-11-08T10:00:00Z");

const latin = (text: string) => new Uint8Array(Buffer.from(text, "latin1"));
const pdf = (pages: number, padding = 0) =>
  latin(
    "%PDF-1.4\n" +
      Array.from({ length: pages }, (_, i) => `${i + 1} 0 obj\n<< /Type /Page >>\nendobj\n`).join("") +
      " ".repeat(padding) +
      "%%EOF",
  );
const jpeg = (size = 64) => {
  const bytes = new Uint8Array(size);
  bytes.set([0xff, 0xd8, 0xff, 0xe0]);
  return bytes;
};
const png = () => new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);

const goodReply: PeopleReply = {
  readable: true,
  rows: [{ sourceRow: 1, values: { studentName: "ليلى حداد" }, unclear: [] }],
};

/** An in-memory read log, and a reader that records what it was given. */
const setup = ({ usedToday = 0, limit = 20 }: { usedToday?: number; limit?: number } = {}) => {
  const log: { id: number; schoolId: number; sheetId: string | null; model: string; succeeded: boolean; createdAt: Date }[] =
    Array.from({ length: usedToday }, (_, i) => ({ id: i + 1, schoolId: SCHOOL, sheetId: "sheet_1", model: "old", succeeded: true, createdAt: NOW }));
  const written: Record<string, unknown>[] = [];
  const db = {
    entrySheetRead: {
      count: async ({ where }: { where: { schoolId: number; createdAt: { gte: Date } } }) =>
        log.filter((row) => row.schoolId === where.schoolId && row.createdAt >= where.createdAt.gte).length,
      create: async ({ data }: { data: { schoolId: number; sheetId: string | null; model: string; succeeded: boolean } }) => {
        written.push({ ...data });
        const row = { id: log.length + 1, createdAt: NOW, ...data };
        log.push(row);
        return { id: row.id };
      },
      update: async ({ where, data }: { where: { id: number }; data: { succeeded: boolean } }) => {
        written.push({ ...data });
        Object.assign(log.find((row) => row.id === where.id)!, data);
      },
    },
  };
  const read = vi.fn(async (_input: Parameters<ReadFileDeps["read"]>[0]) => ({ reply: goodReply }));
  const deps: ReadFileDeps = { db: db as unknown as ReadLogDb, read, model: "gemini-test", limit, now: NOW };
  return { deps, read, log, written, newReads: () => log.slice(usedToday) };
};

afterEach(() => vi.restoreAllMocks());

describe("inspectPeopleFile", () => {
  it("knows photos and PDFs by their bytes, and counts a photo as one page", () => {
    expect(inspectPeopleFile(jpeg())).toEqual({ ok: true, mimeType: "image/jpeg", pages: 1 });
    expect(inspectPeopleFile(png())).toEqual({ ok: true, mimeType: "image/png", pages: 1 });
    expect(inspectPeopleFile(pdf(3))).toEqual({ ok: true, mimeType: "application/pdf", pages: 3 });
  });

  it("refuses anything else, whatever it is called", () => {
    expect(inspectPeopleFile(latin("PK\u0003\u0004 a spreadsheet or a program"))).toEqual({ ok: false, problem: "notSupported" });
    expect(inspectPeopleFile(latin("<svg onload=alert(1)>"))).toEqual({ ok: false, problem: "notSupported" });
    expect(inspectPeopleFile(new Uint8Array())).toEqual({ ok: false, problem: "notSupported" });
  });

  it("allows a PDF of 10 pages and refuses one of 11", () => {
    expect(inspectPeopleFile(pdf(MAX_PDF_PAGES))).toMatchObject({ ok: true, pages: 10 });
    expect(inspectPeopleFile(pdf(MAX_PDF_PAGES + 1))).toEqual({ ok: false, problem: "tooManyPages" });
  });

  it("refuses a PDF over 4 MB, and a photo over the photo limit", () => {
    expect(MAX_PDF_BYTES).toBe(4 * 1024 * 1024);
    expect(inspectPeopleFile(pdf(1, MAX_PDF_BYTES))).toEqual({ ok: false, problem: "pdfTooLarge" });
    expect(inspectPeopleFile(jpeg(MAX_PHOTO_BYTES + 1))).toEqual({ ok: false, problem: "tooLarge" });
  });

  it("refuses a PDF whose pages can't be counted", () => {
    expect(inspectPeopleFile(latin("%PDF-1.7\ntrailer << /Encrypt 5 0 R >>\n1 0 obj << /Type /Page >> endobj"))).toEqual({
      ok: false,
      problem: "pdfUnreadable",
    });
  });
});

describe("readPeopleFileWith", () => {
  it("returns the rows Gemini read from a photo", async () => {
    const { deps, read } = setup();

    const result = await readPeopleFileWith(deps, SCHOOL, "students", jpeg());

    expect(result).toEqual({ ok: true, rows: goodReply.rows, pages: 1 });
    expect(read).toHaveBeenCalledWith({ file: expect.any(Buffer), mimeType: "image/jpeg", kind: "students" });
  });

  it("counts each page of a PDF toward the day's limit, logged without a sheet", async () => {
    const { deps, newReads } = setup();

    await readPeopleFileWith(deps, SCHOOL, "teachers", pdf(4));

    expect(newReads()).toHaveLength(4);
    expect(newReads().every((row) => row.sheetId === null && row.schoolId === SCHOOL && row.succeeded)).toBe(true);
  });

  it("refuses a file that would pass the day's limit, without reading or logging it", async () => {
    const { deps, read, newReads } = setup({ usedToday: 18, limit: 20 });

    const result = await readPeopleFileWith(deps, SCHOOL, "students", pdf(3));

    expect(result).toEqual({ ok: false, problem: "dailyLimit" });
    expect(read).not.toHaveBeenCalled();
    expect(newReads()).toEqual([]);
  });

  it("never sends a refused file to Gemini, and counts nothing for it", async () => {
    const { deps, read, newReads } = setup();

    expect(await readPeopleFileWith(deps, SCHOOL, "students", latin("not a photo"))).toEqual({ ok: false, problem: "notSupported" });
    expect(await readPeopleFileWith(deps, SCHOOL, "students", pdf(11))).toEqual({ ok: false, problem: "tooManyPages" });
    expect(read).not.toHaveBeenCalled();
    expect(newReads()).toEqual([]);
  });

  it("still counts the pages when Gemini fails, since the call was paid for", async () => {
    const { deps, read, newReads } = setup();
    vi.spyOn(console, "error").mockImplementation(() => {});
    read.mockRejectedValue(new Error("503 overloaded"));

    const result = await readPeopleFileWith(deps, SCHOOL, "students", pdf(2));

    expect(result).toEqual({ ok: false, problem: "unavailable" });
    expect(newReads().map((row) => row.succeeded)).toEqual([false, false]);
  });

  it("says the file couldn't be read when the reply has the wrong shape, or Gemini couldn't read it", async () => {
    const { deps, read } = setup();
    read.mockRejectedValueOnce(new InvalidPeopleReplyError("no row list"));
    expect(await readPeopleFileWith(deps, SCHOOL, "students", jpeg())).toEqual({ ok: false, problem: "unreadable" });

    read.mockResolvedValueOnce({ reply: { readable: false, rows: [] } });
    expect(await readPeopleFileWith(deps, SCHOOL, "students", jpeg())).toEqual({ ok: false, problem: "unreadable" });
  });

  it("says so when the file lists nobody", async () => {
    const { deps, read } = setup();
    read.mockResolvedValue({ reply: { readable: true, rows: [] } });

    expect(await readPeopleFileWith(deps, SCHOOL, "students", jpeg())).toEqual({ ok: false, problem: "noRows" });
  });

  it("stores nothing of the file: the log holds only the school, model and status", async () => {
    const { deps, written } = setup();

    await readPeopleFileWith(deps, SCHOOL, "students", pdf(2));

    for (const data of written) {
      expect(Object.keys(data).every((key) => ["schoolId", "sheetId", "model", "succeeded"].includes(key))).toBe(true);
    }
    expect(JSON.stringify(written)).not.toContain("ليلى");
    expect(JSON.stringify(written)).not.toContain("%PDF");
  });

  it("logs only the error's name when something fails, never the file or what was read", async () => {
    const { deps, read } = setup();
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    read.mockRejectedValue(new Error("failed while reading ليلى حداد 123456782"));

    await readPeopleFileWith(deps, SCHOOL, "students", jpeg());

    const text = JSON.stringify(logged.mock.calls);
    expect(text).not.toContain("ليلى");
    expect(text).not.toContain("123456782");
  });
});
