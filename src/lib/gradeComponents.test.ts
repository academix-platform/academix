import { describe, expect, it } from "vitest";
import {
  calculateAnnualGrade,
  calculateWeightedAcademicYearGrade,
  calculateWeightedGrade,
  calculateWeightedSemesterGrade,
  hasValidGradeComponentWeights,
} from "./gradeComponents";

describe("weighted grade components", () => {
  it("requires positive component weights to total 100", () => {
    expect(
      hasValidGradeComponentWeights([
        { weight: 60 },
        { weight: 40 },
      ]),
    ).toBe(true);
    expect(
      hasValidGradeComponentWeights([
        { weight: 60 },
        { weight: 30 },
      ]),
    ).toBe(false);
    expect(
      hasValidGradeComponentWeights([
        { weight: 100 },
        { weight: 0 },
      ]),
    ).toBe(false);
  });

  it("averages marks inside each component before applying its weight", () => {
    const result = calculateWeightedGrade(
      [
        { id: 1, weight: 70 },
        { id: 2, weight: 30 },
      ],
      [
        { gradeSchemeComponentId: 1, score: 8, maxScore: 10 },
        { gradeSchemeComponentId: 1, score: 10, maxScore: 10 },
        { gradeSchemeComponentId: 2, score: 7, maxScore: 10 },
      ],
    );

    expect(result).toEqual({
      averageScore: 84,
      assessmentCount: 3,
      complete: true,
    });
  });

  it("does not produce a final grade while any component is ungraded", () => {
    const result = calculateWeightedGrade(
      [
        { id: 1, weight: 70 },
        { id: 2, weight: 30 },
      ],
      [{ gradeSchemeComponentId: 1, score: 8, maxScore: 10 }],
    );

    expect(result).toEqual({
      averageScore: null,
      assessmentCount: 1,
      complete: false,
    });
  });

  it("averages complete subject schemes equally for a semester", () => {
    const result = calculateWeightedSemesterGrade(
      [
        { components: [{ id: 1, weight: 100 }] },
        { components: [{ id: 2, weight: 100 }] },
      ],
      [
        { gradeSchemeComponentId: 1, score: 80, maxScore: 100 },
        { gradeSchemeComponentId: 2, score: 90, maxScore: 100 },
      ],
    );

    expect(result.averageScore).toBe(85);
    expect(result.assessmentCount).toBe(2);
    expect(result.complete).toBe(true);
  });

  it("requires both semester grades before calculating the annual grade", () => {
    expect(
      calculateAnnualGrade(
        { averageScore: 80, assessmentCount: 3, complete: true },
        { averageScore: 90, assessmentCount: 4, complete: true },
      ),
    ).toEqual({ averageScore: 85, assessmentCount: 7, complete: true });

    expect(
      calculateAnnualGrade(
        { averageScore: 80, assessmentCount: 3, complete: true },
        { averageScore: null, assessmentCount: 0, complete: false },
      ).averageScore,
    ).toBeNull();
  });

  it("calculates annual grades from equally weighted semester averages", () => {
    expect(
      calculateWeightedAcademicYearGrade(
        [
          { semester: "FIRST", components: [{ id: 1, weight: 100 }] },
          { semester: "SECOND", components: [{ id: 2, weight: 100 }] },
        ],
        [
          {
            semester: "FIRST",
            gradeSchemeComponentId: 1,
            score: 80,
            maxScore: 100,
          },
          {
            semester: "SECOND",
            gradeSchemeComponentId: 2,
            score: 90,
            maxScore: 100,
          },
        ],
      ),
    ).toEqual({ averageScore: 85, assessmentCount: 2, complete: true });
  });

  it("keeps a configured annual result incomplete when a semester has no scheme", () => {
    expect(
      calculateWeightedAcademicYearGrade(
        [{ semester: "FIRST", components: [{ id: 1, weight: 100 }] }],
        [
          {
            semester: "FIRST",
            gradeSchemeComponentId: 1,
            score: 80,
            maxScore: 100,
          },
        ],
      )?.complete,
    ).toBe(false);
  });
});
