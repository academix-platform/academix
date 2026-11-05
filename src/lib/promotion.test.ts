import { describe, expect, it } from "vitest";
import { isAcademicYearFinished } from "./promotion";

const at = (iso: string) => new Date(`${iso}T12:00:00`);

describe("isAcademicYearFinished", () => {
  it("is false on the last day of the year", () => {
    expect(isAcademicYearFinished("2026-06-30", at("2026-06-30"))).toBe(false);
  });

  it("is true the day after the year ends", () => {
    expect(isAcademicYearFinished("2026-06-30", at("2026-07-01"))).toBe(true);
  });

  it("is false during the year", () => {
    expect(isAcademicYearFinished("2026-06-30", at("2026-03-15"))).toBe(false);
  });

  it("accepts the end date as a database Date", () => {
    const endDate = new Date("2026-06-30T00:00:00.000Z");
    expect(isAcademicYearFinished(endDate, at("2026-07-01"))).toBe(true);
    expect(isAcademicYearFinished(endDate, at("2026-06-30"))).toBe(false);
  });
});
