import { describe, expect, it } from "vitest";
import {
  MAX_ATTENDANCE_RECORDS,
  attendanceDateError,
  attendancePercentage,
  isIsoDate,
  parseAttendanceRecords,
  todayInTimeZone,
} from "./attendanceRules";

describe("todayInTimeZone", () => {
  it("uses the school's calendar day just after local midnight", () => {
    // 00:30 in Jerusalem (UTC+3 in summer) is still the previous day in UTC.
    const now = new Date("2026-09-14T21:30:00.000Z");
    expect(now.toISOString().slice(0, 10)).toBe("2026-09-14");
    expect(todayInTimeZone(now, "Asia/Jerusalem")).toBe("2026-09-15");
  });

  it("matches UTC when the zone is UTC", () => {
    expect(todayInTimeZone(new Date("2026-09-14T21:30:00.000Z"), "UTC")).toBe("2026-09-14");
  });
});

describe("isIsoDate", () => {
  it("accepts real calendar dates only", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-2-3")).toBe(false);
    expect(isIsoDate("yesterday")).toBe(false);
    expect(isIsoDate(undefined)).toBe(false);
  });
});

describe("attendanceDateError", () => {
  const year = { startDate: "2026-09-01", endDate: "2027-06-30" };

  it("allows today inside the year", () => {
    expect(attendanceDateError("2026-10-05", "2026-10-05", year)).toBeNull();
  });

  it("rejects any other day, even inside the year", () => {
    expect(attendanceDateError("2026-10-04", "2026-10-05", year)).toMatch(/only be saved for today/);
    expect(attendanceDateError("2026-10-06", "2026-10-05", year)).toMatch(/only be saved for today/);
  });

  it("rejects today when it is outside the year", () => {
    expect(attendanceDateError("2027-07-02", "2027-07-02", year)).toMatch(/outside/);
  });

  it("rejects malformed dates", () => {
    expect(attendanceDateError("2026-13-01", "2026-13-01", year)).toBe("Invalid date.");
    expect(attendanceDateError(null, "2026-10-05", year)).toBe("Invalid date.");
  });
});

describe("parseAttendanceRecords", () => {
  it("reads id → present pairs", () => {
    expect(parseAttendanceRecords('{"s1":true,"s2":false}')).toEqual(
      new Map([
        ["s1", true],
        ["s2", false],
      ]),
    );
  });

  it.each([
    ["not a string", null],
    ["malformed JSON", "{s1:true"],
    ["an array", '["s1"]'],
    ["no rows", "{}"],
    ["a non-boolean value", '{"s1":"yes"}'],
    ["an empty id", '{"":true}'],
  ])("rejects %s", (_label, raw) => {
    expect(parseAttendanceRecords(raw)).toBeNull();
  });

  it("rejects more rows than one save allows", () => {
    const rows = Object.fromEntries(
      Array.from({ length: MAX_ATTENDANCE_RECORDS + 1 }, (_, i) => [`s${i}`, true]),
    );
    expect(parseAttendanceRecords(JSON.stringify(rows))).toBeNull();
  });
});

describe("attendancePercentage", () => {
  const schoolDays = new Set(["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04"]);

  it("counts only school days that have a record", () => {
    // Joined on the 3rd: the first two days don't count against them.
    expect(
      attendancePercentage(
        [
          { date: "2026-09-03", present: true },
          { date: "2026-09-04", present: false },
        ],
        schoolDays,
      ),
    ).toBe(50);
  });

  it("ignores records on days that aren't school days", () => {
    expect(
      attendancePercentage(
        [
          { date: "2026-09-01", present: true },
          { date: "2026-09-06", present: false },
        ],
        schoolDays,
      ),
    ).toBe(100);
  });

  it("returns null when nothing has been recorded", () => {
    expect(attendancePercentage([], schoolDays)).toBeNull();
  });

  it("doesn't round one absence up to 100%", () => {
    const days = new Set(Array.from({ length: 200 }, (_, i) => `d${i}`));
    const records = [...days].map((date, i) => ({ date, present: i !== 0 }));
    expect(attendancePercentage(records, days)).toBe(100 - 1);
  });
});
