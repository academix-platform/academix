import { describe, expect, it } from "vitest";
import { academicYearSchema } from "./formValidationSchemas";

const academicYear = {
  name: "2026/2027",
  startDate: new Date("2026-09-01T00:00:00.000Z"),
  endDate: new Date("2027-06-30T00:00:00.000Z"),
  isCurrent: true,
  firstSemesterStartDate: new Date("2026-09-01T00:00:00.000Z"),
  firstSemesterEndDate: new Date("2027-01-15T00:00:00.000Z"),
  secondSemesterStartDate: new Date("2027-02-01T00:00:00.000Z"),
  secondSemesterEndDate: new Date("2027-06-30T00:00:00.000Z"),
  currentSemester: "FIRST",
};

describe("academicYearSchema semester dates", () => {
  it("accepts two ordered semester ranges within the academic year", () => {
    expect(academicYearSchema.safeParse(academicYear).success).toBe(true);
  });

  it("rejects overlapping semesters", () => {
    const result = academicYearSchema.safeParse({
      ...academicYear,
      secondSemesterStartDate: new Date("2027-01-15T00:00:00.000Z"),
    });

    expect(result.success).toBe(false);
  });

  it("rejects semester dates outside the academic year", () => {
    const result = academicYearSchema.safeParse({
      ...academicYear,
      secondSemesterEndDate: new Date("2027-07-01T00:00:00.000Z"),
    });

    expect(result.success).toBe(false);
  });
});
