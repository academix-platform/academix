import { describe, expect, it } from "vitest";
import {
  buildClassEntryRows,
  entryAssessmentWhere,
  parseAssessmentParam,
} from "./classEntry";

describe("parseAssessmentParam", () => {
  it.each([
    ["exam:10", { type: "exam", id: 10 }],
    ["assignment:20", { type: "assignment", id: 20 }],
  ])("reads %s", (param, expected) => {
    expect(parseAssessmentParam(param)).toEqual(expected);
  });

  it.each([undefined, "", "exam", "exam:", "exam:abc", "exam:0", "exam:-4", "exam:1.5", "quiz:3", "exam:3:4"])(
    "ignores %s",
    (param) => {
      expect(parseAssessmentParam(param)).toBeNull();
    },
  );
});

describe("entryAssessmentWhere", () => {
  it("limits a teacher to assessments they own or teach, in their school and year", () => {
    const where = entryAssessmentWhere({ userId: "t1", role: "teacher", schoolId: 1 }, 5);

    expect(where).toMatchObject({ schoolId: 1, academicYearId: 5 });
    expect(where.AND).toContainEqual({
      OR: [{ teacherId: "t1" }, { lesson: { teacherId: "t1" } }],
    });
  });

  it("gives an admin every assessment in their school and year", () => {
    const where = entryAssessmentWhere({ userId: "a1", role: "admin", schoolId: 1 }, 5);

    expect(where).toMatchObject({ schoolId: 1, academicYearId: 5 });
    expect(JSON.stringify(where)).not.toContain("teacherId");
  });

  it("only offers assessments linked to a class, which have a name list", () => {
    const where = entryAssessmentWhere({ userId: "a1", role: "admin", schoolId: 1 }, 5);

    expect(where.AND).toContainEqual({
      OR: [{ classId: { not: null } }, { lesson: { isNot: null } }],
    });
  });
});

describe("buildClassEntryRows", () => {
  const students = [
    { id: "s1", name: "سليم الوادي" },
    { id: "s2", name: "ليان القصير" },
    { id: "s3", name: "كريم الشامي" },
  ];

  it("lists every student with no existing result", () => {
    expect(buildClassEntryRows(students, [], [])).toEqual({
      rows: [
        { studentId: "s1", name: "سليم الوادي", existingScore: null },
        { studentId: "s2", name: "ليان القصير", existingScore: null },
        { studentId: "s3", name: "كريم الشامي", existingScore: null },
      ],
      onlineCount: 0,
    });
  });

  it("leaves out students who handed the work in online, and counts them", () => {
    const { rows, onlineCount } = buildClassEntryRows(students, ["s2"], []);

    expect(rows.map((row) => row.studentId)).toEqual(["s1", "s3"]);
    expect(onlineCount).toBe(1);
  });

  it("shows a student's existing score", () => {
    const { rows } = buildClassEntryRows(students, [], [{ studentId: "s3", score: 17.5 }]);

    expect(rows[2].existingScore).toBe(17.5);
  });

  it("ignores online submissions from students who aren't in the class", () => {
    expect(buildClassEntryRows(students, ["s9"], []).onlineCount).toBe(0);
  });
});
