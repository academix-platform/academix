import { describe, expect, it } from "vitest";
import { fakeExam, fakeResultDb } from "@/lib/results/testing/fakeResultDb";
import { createResultSheetWith } from "./createSheet";

const teacher = { userId: "teacher_1", role: "teacher", schoolId: 1 };
const otherTeacher = { userId: "teacher_2", role: "teacher", schoolId: 1 };
const otherSchoolAdmin = { userId: "admin_9", role: "admin", schoolId: 2 };

const classStudents = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    id: `s${String(index + 1).padStart(2, "0")}`,
    name: `طالب ${String(index + 1).padStart(2, "0")}`,
    schoolId: 1,
    classId: 3,
    status: "ACTIVE",
  }));

const exam = (fields = {}) => fakeExam({ class: { name: "7A" }, ...fields } as never);
const examRef = { type: "exam" as const, id: 10 };
const codes = (...values: string[]) => () => values.shift() ?? "ZZZZZZ";

describe("createResultSheetWith", () => {
  it("saves the class list as numbered rows with a code", async () => {
    const { db, sheets } = fakeResultDb({ exams: [exam()], students: classStudents(2) });

    const outcome = await createResultSheetWith(db, teacher, examRef, 5, codes("ABC234"));

    expect(outcome).toEqual({ sheetId: sheets[0].id, code: "ABC234", pageCount: 1 });
    expect(sheets[0]).toMatchObject({
      code: "ABC234",
      kind: "RESULT",
      schoolId: 1,
      academicYearId: 5,
      classId: 3,
      examId: 10,
      assignmentId: null,
      createdById: "teacher_1",
      rows: [
        { page: 1, rowNumber: 1, studentId: "s01", name: "طالب 01" },
        { page: 1, rowNumber: 2, studentId: "s02", name: "طالب 02" },
      ],
    });
  });

  it("puts a class of 31 on two pages", async () => {
    const { db } = fakeResultDb({ exams: [exam()], students: classStudents(31) });

    const outcome = await createResultSheetWith(db, teacher, examRef, 5, codes("ABC234"));

    expect(outcome).toMatchObject({ pageCount: 2 });
  });

  it("leaves out students who handed the work in online", async () => {
    const { db, sheets } = fakeResultDb({
      exams: [exam()],
      students: classStudents(3),
      submissions: [{ examId: 10, studentId: "s02" }],
    });

    await createResultSheetWith(db, teacher, examRef, 5, codes("ABC234"));

    expect(sheets[0].rows.map((row: { studentId: string }) => row.studentId)).toEqual(["s01", "s03"]);
  });

  it("leaves out students who have left the class", async () => {
    const students = [...classStudents(2), { ...classStudents(3)[2], status: "LEFT" }];
    const { db, sheets } = fakeResultDb({ exams: [exam()], students });

    await createResultSheetWith(db, teacher, examRef, 5, codes("ABC234"));

    expect(sheets[0].rows).toHaveLength(2);
  });

  it("picks another code when the first is taken in the school", async () => {
    const { db, sheets } = fakeResultDb({
      exams: [exam()],
      students: classStudents(1),
      sheets: [{ id: "old", schoolId: 1, code: "TAKEN2" }],
    });

    const outcome = await createResultSheetWith(db, teacher, examRef, 5, codes("TAKEN2", "FRESH3"));

    expect(outcome).toMatchObject({ code: "FRESH3" });
    expect(sheets).toHaveLength(2);
  });

  it("refuses an assessment with no class", async () => {
    const { db, sheets } = fakeResultDb({
      exams: [exam({ classId: null, class: null })],
      students: classStudents(1),
    });

    const outcome = await createResultSheetWith(db, teacher, examRef, 5, codes("ABC234"));

    expect(outcome).toEqual({ error: "notFound" });
    expect(sheets).toEqual([]);
  });

  it("refuses another teacher's assessment", async () => {
    const { db, sheets } = fakeResultDb({ exams: [exam()], students: classStudents(1) });

    expect(await createResultSheetWith(db, otherTeacher, examRef, 5, codes("ABC234"))).toEqual({
      error: "notFound",
    });
    expect(sheets).toEqual([]);
  });

  it("refuses a user from another school", async () => {
    const { db } = fakeResultDb({ exams: [exam()], students: classStudents(1) });

    expect(await createResultSheetWith(db, otherSchoolAdmin, examRef, 5, codes("ABC234"))).toEqual({
      error: "notFound",
    });
  });

  it("refuses an assessment from another academic year", async () => {
    const { db } = fakeResultDb({ exams: [exam({ academicYearId: 4 })], students: classStudents(1) });

    expect(await createResultSheetWith(db, teacher, examRef, 5, codes("ABC234"))).toEqual({
      error: "notFound",
    });
  });

  it("refuses a class with no one to list", async () => {
    const { db, sheets } = fakeResultDb({ exams: [exam()], students: [] });

    expect(await createResultSheetWith(db, teacher, examRef, 5, codes("ABC234"))).toEqual({
      error: "noStudents",
    });
    expect(sheets).toEqual([]);
  });
});
