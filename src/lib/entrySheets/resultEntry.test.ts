import { describe, expect, it } from "vitest";
import {
  fakeAssignment,
  fakeExam,
  fakeResultDb,
} from "@/lib/results/testing/fakeResultDb";
import {
  MAX_CLASS_ROWS,
  classResultsSchema,
  saveClassResultsWith,
} from "./resultEntry";

const admin = { userId: "admin_1", role: "admin", schoolId: 1 };
const teacher = { userId: "teacher_1", role: "teacher", schoolId: 1 };
const otherTeacher = { userId: "teacher_2", role: "teacher", schoolId: 1 };
const otherSchoolAdmin = { userId: "admin_9", role: "admin", schoolId: 2 };

const students = [
  { id: "s1", schoolId: 1, classId: 3 },
  { id: "s2", schoolId: 1, classId: 3 },
  { id: "s3", schoolId: 1, classId: 3 },
];

const input = (rows: { studentId: string; score: number; replace?: boolean }[]) => ({
  assessmentType: "exam" as const,
  assessmentId: 10,
  rows: rows.map((row) => ({ replace: false, ...row })),
});

describe("saveClassResultsWith", () => {
  it("creates a result for every row", async () => {
    const { db, writes } = fakeResultDb({ exams: [fakeExam()], students });

    const outcome = await saveClassResultsWith(
      db,
      teacher,
      input([
        { studentId: "s1", score: 15 },
        { studentId: "s2", score: 12.5 },
      ]),
    );

    expect(outcome).toEqual({
      saved: [
        { studentId: "s1", score: 15, replaced: false },
        { studentId: "s2", score: 12.5, replaced: false },
      ],
    });
    expect(writes.map((write) => write.row)).toMatchObject([
      { schoolId: 1, studentId: "s1", score: 15, examId: 10, assignmentId: null, academicYearId: 5 },
      { schoolId: 1, studentId: "s2", score: 12.5, examId: 10, assignmentId: null, academicYearId: 5 },
    ]);
  });

  it("saves assignment results against the assignment", async () => {
    const { db, writes } = fakeResultDb({ assignments: [fakeAssignment()], students });
    const assignmentInput = { ...input([{ studentId: "s1", score: 8 }]), assessmentType: "assignment" as const, assessmentId: 20 };

    await saveClassResultsWith(db, teacher, assignmentInput);

    expect(writes[0].row).toMatchObject({ assignmentId: 20, examId: null });
  });

  it("saves nothing when one row is invalid, even rows before it", async () => {
    const { db, writes } = fakeResultDb({ exams: [fakeExam()], students });

    const outcome = await saveClassResultsWith(
      db,
      teacher,
      input([
        { studentId: "s1", score: 15 },
        { studentId: "s2", score: 21 },
        { studentId: "s3", score: 9 },
      ]),
    );

    expect(outcome).toEqual({ error: "Score cannot be greater than 20.", studentId: "s2" });
    expect(writes).toEqual([]);
  });

  it("refuses to replace an existing result unless the row says to", async () => {
    const results = [{ id: 1, schoolId: 1, studentId: "s1", score: 4, examId: 10 }];
    const { db, writes } = fakeResultDb({ exams: [fakeExam()], students, results });

    const outcome = await saveClassResultsWith(db, teacher, input([{ studentId: "s1", score: 15 }]));

    expect(outcome).toEqual({
      error: "This student already has a result for this assessment.",
      studentId: "s1",
    });
    expect(writes).toEqual([]);
  });

  it("replaces an existing result when the row says to, without a duplicate", async () => {
    const results = [{ id: 1, schoolId: 1, studentId: "s1", score: 4, examId: 10 }];
    const { db, results: stored } = fakeResultDb({ exams: [fakeExam()], students, results });

    const outcome = await saveClassResultsWith(
      db,
      teacher,
      input([{ studentId: "s1", score: 15, replace: true }]),
    );

    expect(outcome).toEqual({ saved: [{ studentId: "s1", score: 15, replaced: true }] });
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ id: 1, score: 15 });
  });

  it("creates a result when a replace row has nothing to replace", async () => {
    const { db, writes } = fakeResultDb({ exams: [fakeExam()], students });

    await saveClassResultsWith(db, teacher, input([{ studentId: "s1", score: 15, replace: true }]));

    expect(writes.map((write) => write.kind)).toEqual(["create"]);
  });

  it("refuses another teacher's assessment", async () => {
    const { db, writes } = fakeResultDb({ exams: [fakeExam()], students });

    const outcome = await saveClassResultsWith(db, otherTeacher, input([{ studentId: "s1", score: 15 }]));

    expect(outcome).toEqual({ error: "Selected assessment was not found.", studentId: "s1" });
    expect(writes).toEqual([]);
  });

  it("doesn't tell another teacher that a result already exists", async () => {
    const results = [{ id: 1, schoolId: 1, studentId: "s1", score: 4, examId: 10 }];
    const { db } = fakeResultDb({ exams: [fakeExam()], students, results });

    const outcome = await saveClassResultsWith(db, otherTeacher, input([{ studentId: "s1", score: 15 }]));

    expect(outcome).toMatchObject({ error: "Selected assessment was not found." });
  });

  it("refuses a user from another school", async () => {
    const { db, writes } = fakeResultDb({ exams: [fakeExam()], students });

    const outcome = await saveClassResultsWith(db, otherSchoolAdmin, input([{ studentId: "s1", score: 15 }]));

    expect(outcome).toMatchObject({ error: "Selected assessment was not found." });
    expect(writes).toEqual([]);
  });

  it("refuses a student from another class", async () => {
    const { db } = fakeResultDb({
      exams: [fakeExam()],
      students: [...students, { id: "s9", schoolId: 1, classId: 4 }],
    });

    const outcome = await saveClassResultsWith(db, admin, input([{ studentId: "s9", score: 15 }]));

    expect(outcome).toEqual({
      error: "This student is not in the class of this assessment.",
      studentId: "s9",
    });
  });

  it("refuses a student who handed the work in online", async () => {
    const { db, writes } = fakeResultDb({
      exams: [fakeExam()],
      students,
      submissions: [{ examId: 10, studentId: "s2" }],
    });

    const outcome = await saveClassResultsWith(
      db,
      admin,
      input([
        { studentId: "s1", score: 15 },
        { studentId: "s2", score: 12 },
      ]),
    );

    expect(outcome).toMatchObject({ studentId: "s2", error: expect.stringMatching(/online/) });
    expect(writes).toEqual([]);
  });
});

describe("classResultsSchema", () => {
  const valid = input([{ studentId: "s1", score: 15 }]);

  it("accepts a valid class of results", () => {
    expect(classResultsSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects the same student twice", () => {
    const twice = input([
      { studentId: "s1", score: 15 },
      { studentId: "s1", score: 9 },
    ]);

    expect(classResultsSchema.safeParse(twice).success).toBe(false);
  });

  it("rejects an empty class", () => {
    expect(classResultsSchema.safeParse(input([])).success).toBe(false);
  });

  it(`rejects more than ${MAX_CLASS_ROWS} rows`, () => {
    const rows = Array.from({ length: MAX_CLASS_ROWS + 1 }, (_, index) => ({
      studentId: `s${index}`,
      score: 1,
    }));

    expect(classResultsSchema.safeParse(input(rows)).success).toBe(false);
  });

  it.each([
    ["a negative score", -1],
    ["an infinite score", Number.POSITIVE_INFINITY],
    ["a missing score", Number.NaN],
  ])("rejects %s", (_label, score) => {
    expect(classResultsSchema.safeParse(input([{ studentId: "s1", score }])).success).toBe(false);
  });

  it("rejects a score sent as text, so nothing is coerced by accident", () => {
    const text = { ...valid, rows: [{ studentId: "s1", score: "15", replace: false }] };

    expect(classResultsSchema.safeParse(text).success).toBe(false);
  });
});
