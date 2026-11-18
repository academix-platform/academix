import { describe, expect, it } from "vitest";

import {
  DEFAULT_SHEET_SCAN_DAILY_LIMIT,
  ReadLogDb,
  markPageReadsSucceeded,
  markSheetReadSucceeded,
  reservePageReads,
  reserveSheetRead,
  sheetScanDailyLimit,
  startOfSchoolDay,
} from "./readLimit";

type LogRow = {
  id: number;
  schoolId: number;
  sheetId: string | null;
  model: string;
  succeeded: boolean;
  createdAt: Date;
};

/** An in-memory EntrySheetRead table that records every write's data. */
const fakeReadLog = (rows: Omit<LogRow, "id">[] = []) => {
  const table: LogRow[] = rows.map((row, i) => ({ id: i + 1, ...row }));
  const written: Record<string, unknown>[] = [];
  let clock = new Date("2026-11-08T10:00:00Z");
  const db = {
    entrySheetRead: {
      count: async ({ where }: { where: { schoolId: number; createdAt: { gte: Date } } }) =>
        table.filter((row) => row.schoolId === where.schoolId && row.createdAt >= where.createdAt.gte).length,
      create: async ({ data }: { data: Omit<LogRow, "id" | "createdAt"> }) => {
        written.push({ ...data });
        const row = { id: table.length + 1, createdAt: clock, ...data };
        table.push(row);
        return { id: row.id };
      },
      update: async ({ where, data }: { where: { id: number }; data: Partial<LogRow> }) => {
        written.push({ ...data });
        const row = table.find((r) => r.id === where.id);
        if (!row) throw new Error("not found");
        Object.assign(row, data);
        return row;
      },
    },
  };
  return {
    db: db as unknown as ReadLogDb,
    table,
    written,
    setClock: (date: Date) => {
      clock = date;
    },
  };
};

const NOW = new Date("2026-11-08T10:00:00Z");
// Asia/Jerusalem is UTC+2 in November, so the school day began at 22:00 UTC.
const DAY_START = new Date("2026-11-07T22:00:00Z");
const read = (schoolId: number, createdAt: Date, succeeded = true) => ({
  schoolId,
  sheetId: "sheet_1",
  model: "gemini-test",
  succeeded,
  createdAt,
});
const reserve = (db: ReadLogDb, limit = 3, schoolId = 1) =>
  reserveSheetRead(db, { schoolId, sheetId: "sheet_1", model: "gemini-test", limit, now: NOW });

describe("sheetScanDailyLimit", () => {
  it("defaults to 200", () => {
    expect(DEFAULT_SHEET_SCAN_DAILY_LIMIT).toBe(200);
    expect(sheetScanDailyLimit(undefined)).toBe(200);
    expect(sheetScanDailyLimit("")).toBe(200);
  });

  it("uses SHEET_SCAN_DAILY_LIMIT when it is a whole number above 0", () => {
    expect(sheetScanDailyLimit("50")).toBe(50);
    expect(sheetScanDailyLimit(" 1000 ")).toBe(1000);
  });

  it.each(["abc", "0", "-5", "12.5", "10 pages"])("ignores %j and uses 200", (value) => {
    expect(sheetScanDailyLimit(value)).toBe(200);
  });
});

describe("startOfSchoolDay", () => {
  it("is midnight in the school's time zone", () => {
    expect(startOfSchoolDay(NOW, "Asia/Jerusalem")).toEqual(DAY_START);
  });

  it("uses the school's date, not the UTC date, just after local midnight", () => {
    // 23:30 UTC on the 7th is 01:30 on the 8th in Jerusalem.
    expect(startOfSchoolDay(new Date("2026-11-07T23:30:00Z"), "Asia/Jerusalem")).toEqual(DAY_START);
  });

  it("follows summer time", () => {
    // Asia/Jerusalem is UTC+3 in July.
    expect(startOfSchoolDay(new Date("2026-07-01T12:00:00Z"), "Asia/Jerusalem")).toEqual(
      new Date("2026-06-30T21:00:00Z"),
    );
  });

  it("uses midnight's own offset on the day the clocks go back", () => {
    // Summer time ends on 25 October 2026: midnight was still UTC+3, noon is UTC+2.
    expect(startOfSchoolDay(new Date("2026-10-25T12:00:00Z"), "Asia/Jerusalem")).toEqual(
      new Date("2026-10-24T21:00:00Z"),
    );
  });
});

describe("reserveSheetRead", () => {
  it("logs the read and allows it while the school is under its limit", async () => {
    const { db, table } = fakeReadLog([read(1, DAY_START), read(1, NOW)]);
    const outcome = await reserve(db, 3);
    expect(outcome).toEqual({ allowed: true, readId: 3 });
    expect(table).toHaveLength(3);
    expect(table[2]).toMatchObject({ schoolId: 1, sheetId: "sheet_1", model: "gemini-test", succeeded: false });
  });

  it("refuses the read and logs nothing once the school has reached its limit", async () => {
    const { db, table } = fakeReadLog([read(1, NOW), read(1, NOW), read(1, NOW)]);
    expect(await reserve(db, 3)).toEqual({ allowed: false });
    expect(table).toHaveLength(3);
  });

  it("counts reads that failed, since each one was still paid for", async () => {
    const { db } = fakeReadLog([read(1, NOW, false), read(1, NOW, false), read(1, NOW, false)]);
    expect(await reserve(db, 3)).toEqual({ allowed: false });
  });

  it("counts only this school's reads", async () => {
    const { db } = fakeReadLog([read(2, NOW), read(2, NOW), read(2, NOW)]);
    expect(await reserve(db, 3, 1)).toMatchObject({ allowed: true });
  });

  it("starts counting again at the start of the school day", async () => {
    const lastNight = new Date("2026-11-07T21:59:59Z");
    const { db } = fakeReadLog([read(1, lastNight), read(1, lastNight), read(1, lastNight)]);
    expect(await reserve(db, 3)).toMatchObject({ allowed: true });
  });
});

describe("a read with no sheet, such as a people import page", () => {
  const reservePeopleRead = (db: ReadLogDb, limit = 3) =>
    reserveSheetRead(db, { schoolId: 1, model: "gemini-test", limit, now: NOW });

  it("is logged without a sheet", async () => {
    const { db, table, written } = fakeReadLog();
    expect(await reservePeopleRead(db)).toEqual({ allowed: true, readId: 1 });
    expect(table[0]).toMatchObject({ schoolId: 1, sheetId: null, succeeded: false });
    expect(Object.keys(written[0]).sort()).toEqual(["model", "schoolId", "sheetId", "succeeded"]);
  });

  it("shares the school's daily limit with sheet reads", async () => {
    const { db, table } = fakeReadLog([read(1, NOW), read(1, NOW)]);
    expect(await reservePeopleRead(db, 3)).toMatchObject({ allowed: true });
    expect(await reservePeopleRead(db, 3)).toEqual({ allowed: false });
    expect(await reserve(db, 3)).toEqual({ allowed: false });
    expect(table).toHaveLength(3);
  });

  it("is marked as succeeded without being given a sheet", async () => {
    const { db, table, written } = fakeReadLog();
    const outcome = await reservePeopleRead(db);
    if (!outcome.allowed) throw new Error("expected the read to be allowed");
    await markSheetReadSucceeded(db, outcome.readId);

    expect(written[1]).toEqual({ succeeded: true });
    expect(table[0]).toMatchObject({ sheetId: null, succeeded: true });
  });
});

describe("the read log", () => {
  it("holds only the school, sheet, model and status, and the database adds the time", async () => {
    const { db, table, written } = fakeReadLog();
    const outcome = await reserve(db);
    if (!outcome.allowed) throw new Error("expected the read to be allowed");
    await markSheetReadSucceeded(db, outcome.readId, "sheet_2");

    expect(Object.keys(written[0]).sort()).toEqual(["model", "schoolId", "sheetId", "succeeded"]);
    expect(Object.keys(written[1]).sort()).toEqual(["sheetId", "succeeded"]);
    expect(Object.keys(table[0]).sort()).toEqual(["createdAt", "id", "model", "schoolId", "sheetId", "succeeded"]);
    expect(table[0]).toMatchObject({ sheetId: "sheet_2", succeeded: true });
  });
});

describe("reading a file of several pages", () => {
  const reservePages = (db: ReadLogDb, pages: number, limit = 10) =>
    reservePageReads(db, { schoolId: 1, model: "gemini-test", limit, pages, now: NOW });

  it("logs one read for each page, without a sheet", async () => {
    const { db, table } = fakeReadLog();

    const reserved = await reservePages(db, 3);

    expect(reserved).toEqual({ allowed: true, readIds: [1, 2, 3] });
    expect(table).toHaveLength(3);
    expect(table.every((row) => row.sheetId === null && row.succeeded === false && row.schoolId === 1)).toBe(true);
  });

  it("allows a file that brings the school exactly to its limit", async () => {
    const { db, table } = fakeReadLog([read(1, NOW), read(1, NOW)]);

    expect((await reservePages(db, 8)).allowed).toBe(true);
    expect(table).toHaveLength(10);
  });

  it("refuses the whole file, logging nothing, when its pages would pass the limit", async () => {
    const { db, table } = fakeReadLog([read(1, NOW), read(1, NOW), read(1, NOW)]);

    expect(await reservePages(db, 8)).toEqual({ allowed: false });
    expect(table).toHaveLength(3);
  });

  it("shares the day's limit with sheet reads, and counts only this school", async () => {
    const { db } = fakeReadLog([read(2, NOW), read(2, NOW), read(2, NOW)]);

    expect((await reservePages(db, 10)).allowed).toBe(true);
    expect((await reserve(db, 10)).allowed).toBe(false);
  });

  it("marks every page as read once the file was read", async () => {
    const { db, table } = fakeReadLog();
    const reserved = await reservePages(db, 2);
    if (!reserved.allowed) throw new Error("expected the read to be allowed");

    await markPageReadsSucceeded(db, reserved.readIds);

    expect(table.map((row) => row.succeeded)).toEqual([true, true]);
    expect(table.every((row) => row.sheetId === null)).toBe(true);
  });

  it("refuses a file with no pages", async () => {
    const { db } = fakeReadLog();

    await expect(reservePages(db, 0)).rejects.toThrow();
  });
});
