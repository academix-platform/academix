// Test helper: an in-memory stand-in for the Prisma queries the result rules
// make. It applies the same filters, so school and teacher scoping are really
// exercised. Not imported by app code.

import type { ManualResultDb } from "../manualResult";

type Owner = {
  teacherId: string | null;
  lesson: { teacherId: string; classId: number } | null;
};
export type FakeExam = Owner & {
  id: number;
  schoolId: number;
  academicYearId: number;
  classId: number | null;
  questions: { points: number }[];
};
export type FakeAssignment = Owner & {
  id: number;
  schoolId: number;
  academicYearId: number;
  classId: number | null;
  maxScore: number;
};
export type FakeResult = {
  id: number;
  schoolId: number;
  studentId: string;
  score?: number;
  examId?: number | null;
  assignmentId?: number | null;
};
export type FakeData = {
  exams?: FakeExam[];
  assignments?: FakeAssignment[];
  students?: { id: string; schoolId: number; classId: number }[];
  results?: FakeResult[];
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

export const fakeExam = (fields: Partial<FakeExam> = {}): FakeExam => ({
  id: 10,
  schoolId: 1,
  academicYearId: 5,
  classId: 3,
  teacherId: "teacher_1",
  lesson: null,
  questions: [{ points: 15 }, { points: 5 }],
  ...fields,
});

export const fakeAssignment = (fields: Partial<FakeAssignment> = {}): FakeAssignment => ({
  id: 20,
  schoolId: 1,
  academicYearId: 5,
  classId: 3,
  teacherId: "teacher_1",
  lesson: null,
  maxScore: 10,
  ...fields,
});

/** Returns the fake client and the result rows, which writes change. */
export const fakeResultDb = (data: FakeData) => {
  const results = [...(data.results ?? [])];
  const writes: { kind: "create" | "update"; row: FakeResult }[] = [];

  const finder = <T,>(rows: T[] = []) => ({
    findFirst: async ({ where }: { where: Where }) =>
      rows.find((row) => matches(row as Record<string, unknown>, where)) ?? null,
    count: async ({ where }: { where: Where }) =>
      rows.filter((row) => matches(row as Record<string, unknown>, where)).length,
  });

  const db = {
    exam: finder(data.exams),
    assignment: finder(data.assignments),
    student: finder(data.students),
    submission: finder(data.submissions),
    assignmentSubmission: finder(data.assignmentSubmissions),
    result: {
      ...finder(results),
      create: async ({ data: row }: { data: Omit<FakeResult, "id"> }) => {
        const created = { id: results.length + 100, ...row };
        results.push(created);
        writes.push({ kind: "create", row: created });
        return created;
      },
      update: async ({ where, data: changes }: { where: { id: number }; data: Partial<FakeResult> }) => {
        const row = results.find((result) => result.id === where.id);
        if (!row) throw new Error(`No result ${where.id}`);
        Object.assign(row, changes);
        writes.push({ kind: "update", row });
        return row;
      },
    },
  } as unknown as ManualResultDb;

  return { db, results, writes };
};
