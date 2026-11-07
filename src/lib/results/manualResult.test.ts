import { describe, expect, it } from "vitest";
import {
  ManualResultDb,
  hasOnlineSubmission,
  resolveManualResult,
} from "./manualResult";

// An in-memory stand-in for the few Prisma queries these rules make. It
// applies the same filters, so school and teacher scoping are really tested.
type Owner = { teacherId: string | null; lesson: { teacherId: string; classId: number } | null };
type FakeExam = Owner & {
  id: number;
  schoolId: number;
  academicYearId: number;
  classId: number | null;
  questions: { points: number }[];
};
type FakeAssignment = Owner & {
  id: number;
  schoolId: number;
  academicYearId: number;
  classId: number | null;
  maxScore: number;
};
type FakeData = {
  exams?: FakeExam[];
  assignments?: FakeAssignment[];
  students?: { id: string; schoolId: number; classId: number }[];
  results?: { id: number; schoolId: number; studentId: string; examId?: number; assignmentId?: number }[];
  submissions?: { examId: number; studentId: string }[];
  assignmentSubmissions?: { assignmentId: number; studentId: string }[];
};

type Where = Record<string, unknown> & {
  OR?: { teacherId?: string; lesson?: { teacherId: string } }[];
  NOT?: { id: number };
};

const ownedBy = (row: Owner, where: Where) =>
  !where.OR ||
  where.OR.some(
    (rule) =>
      (rule.teacherId !== undefined && row.teacherId === rule.teacherId) ||
      (rule.lesson !== undefined && row.lesson?.teacherId === rule.lesson.teacherId),
  );

const matches = (row: Record<string, unknown>, where: Where) =>
  Object.entries(where).every(([key, value]) => {
    if (key === "OR") return ownedBy(row as unknown as Owner, where);
    if (key === "NOT") return row.id !== where.NOT?.id;
    return row[key] === value;
  });

const fakeDb = (data: FakeData) => {
  const finder = <T,>(rows: T[] = []) => ({
    findFirst: async ({ where }: { where: Where }) =>
      rows.find((row) => matches(row as Record<string, unknown>, where)) ?? null,
    count: async ({ where }: { where: Where }) =>
      rows.filter((row) => matches(row as Record<string, unknown>, where)).length,
  });
  return {
    exam: finder(data.exams),
    assignment: finder(data.assignments),
    student: finder(data.students),
    result: finder(data.results),
    submission: finder(data.submissions),
    assignmentSubmission: finder(data.assignmentSubmissions),
  } as unknown as ManualResultDb;
};

const admin = { userId: "admin_1", role: "admin", schoolId: 1 };
const teacher = { userId: "teacher_1", role: "teacher", schoolId: 1 };

const exam = (fields: Partial<FakeExam> = {}): FakeExam => ({
  id: 10,
  schoolId: 1,
  academicYearId: 5,
  classId: 3,
  teacherId: "teacher_1",
  lesson: null,
  questions: [{ points: 15 }, { points: 5 }],
  ...fields,
});

const assignment = (fields: Partial<FakeAssignment> = {}): FakeAssignment => ({
  id: 20,
  schoolId: 1,
  academicYearId: 5,
  classId: 3,
  teacherId: "teacher_1",
  lesson: null,
  maxScore: 10,
  ...fields,
});

const student = { id: "student_1", schoolId: 1, classId: 3 };

const examResult = (fields: Record<string, unknown> = {}) => ({
  studentId: "student_1",
  score: 12,
  assessmentType: "exam" as const,
  assessmentId: 10,
  ...fields,
});

describe("resolveManualResult", () => {
  it("returns the fields to store for an exam result", async () => {
    const db = fakeDb({ exams: [exam()], students: [student] });

    expect(await resolveManualResult(db, admin, examResult())).toEqual({
      academicYearId: 5,
      examId: 10,
      assignmentId: null,
    });
  });

  it("returns the fields to store for an assignment result", async () => {
    const db = fakeDb({ assignments: [assignment()], students: [student] });
    const data = examResult({ assessmentType: "assignment", assessmentId: 20, score: 8 });

    expect(await resolveManualResult(db, admin, data)).toEqual({
      academicYearId: 5,
      examId: null,
      assignmentId: 20,
    });
  });

  it("refuses an assessment from another school", async () => {
    const db = fakeDb({ exams: [exam({ schoolId: 2 })], students: [student] });

    expect(await resolveManualResult(db, admin, examResult())).toEqual({
      error: "Selected assessment was not found.",
    });
  });

  it("refuses a teacher using another teacher's assessment", async () => {
    const db = fakeDb({ exams: [exam({ teacherId: "teacher_2" })], students: [student] });

    expect(await resolveManualResult(db, teacher, examResult())).toEqual({
      error: "Selected assessment was not found.",
    });
  });

  it("lets a teacher use an assessment from a lesson they teach", async () => {
    const lesson = { teacherId: "teacher_1", classId: 3 };
    const db = fakeDb({
      exams: [exam({ teacherId: null, classId: null, lesson })],
      students: [student],
    });

    expect(await resolveManualResult(db, teacher, examResult())).toMatchObject({ examId: 10 });
  });

  it("lets an admin use any assessment in their school", async () => {
    const db = fakeDb({ exams: [exam({ teacherId: "teacher_2" })], students: [student] });

    expect(await resolveManualResult(db, admin, examResult())).toMatchObject({ examId: 10 });
  });

  it("refuses a student from another school", async () => {
    const db = fakeDb({ exams: [exam()], students: [{ ...student, schoolId: 2 }] });

    expect(await resolveManualResult(db, admin, examResult())).toEqual({
      error: "Selected student was not found.",
    });
  });

  it("refuses a student outside the assessment's class", async () => {
    const db = fakeDb({ exams: [exam()], students: [{ ...student, classId: 4 }] });

    expect(await resolveManualResult(db, admin, examResult())).toEqual({
      error: "This student is not in the class of this assessment.",
    });
  });

  it("allows any student of the school when the assessment has no class", async () => {
    const db = fakeDb({
      exams: [exam({ classId: null })],
      students: [{ ...student, classId: 4 }],
    });

    expect(await resolveManualResult(db, admin, examResult())).toMatchObject({ examId: 10 });
  });

  it("refuses a score above the exam's total points", async () => {
    const db = fakeDb({ exams: [exam()], students: [student] });

    expect(await resolveManualResult(db, admin, examResult({ score: 21 }))).toEqual({
      error: "Score cannot be greater than 20.",
    });
  });

  it("grades an exam without questions out of 100", async () => {
    const db = fakeDb({ exams: [exam({ questions: [] })], students: [student] });

    expect(await resolveManualResult(db, admin, examResult({ score: 100 }))).toMatchObject({
      examId: 10,
    });
    expect(await resolveManualResult(db, admin, examResult({ score: 101 }))).toEqual({
      error: "Score cannot be greater than 100.",
    });
  });

  it("refuses a score above the assignment's maximum", async () => {
    const db = fakeDb({ assignments: [assignment()], students: [student] });
    const data = examResult({ assessmentType: "assignment", assessmentId: 20, score: 11 });

    expect(await resolveManualResult(db, admin, data)).toEqual({
      error: "Score cannot be greater than 10.",
    });
  });

  it("refuses a second result for the same student and assessment", async () => {
    const results = [{ id: 1, schoolId: 1, studentId: "student_1", examId: 10 }];
    const db = fakeDb({ exams: [exam()], students: [student], results });

    expect(await resolveManualResult(db, admin, examResult())).toEqual({
      error: "This student already has a result for this assessment.",
    });
  });

  it("ignores the result being updated when looking for duplicates", async () => {
    const results = [{ id: 1, schoolId: 1, studentId: "student_1", examId: 10 }];
    const db = fakeDb({ exams: [exam()], students: [student], results });

    expect(await resolveManualResult(db, admin, examResult(), 1)).toMatchObject({ examId: 10 });
  });
});

describe("hasOnlineSubmission", () => {
  it("finds an online exam submission", async () => {
    const db = fakeDb({ submissions: [{ examId: 10, studentId: "student_1" }] });

    expect(await hasOnlineSubmission(db, examResult())).toBe(true);
  });

  it("finds an online assignment submission", async () => {
    const db = fakeDb({ assignmentSubmissions: [{ assignmentId: 20, studentId: "student_1" }] });
    const data = examResult({ assessmentType: "assignment", assessmentId: 20 });

    expect(await hasOnlineSubmission(db, data)).toBe(true);
  });

  it("ignores another student's submission", async () => {
    const db = fakeDb({ submissions: [{ examId: 10, studentId: "student_2" }] });

    expect(await hasOnlineSubmission(db, examResult())).toBe(false);
  });
});
