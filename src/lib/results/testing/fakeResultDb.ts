// Test helper: an in-memory stand-in for the Prisma queries the result and
// entry sheet rules make. It applies the same filters (equality, AND, OR,
// NOT, relation filters, `not`, `isNot`, `in`), so school and teacher scoping
// are really exercised. `select` and `orderBy` are ignored. Not imported by
// app code.

import type { PrismaClient } from "@prisma/client";

type Lesson = { teacherId: string; classId: number; class?: { name: string } };
type Owner = { teacherId: string | null; lesson: Lesson | null };
export type FakeExam = Owner & {
  id: number;
  schoolId: number;
  academicYearId: number;
  classId: number | null;
  class?: { name: string } | null;
  questions: { points: number }[];
};
export type FakeAssignment = Owner & {
  id: number;
  schoolId: number;
  academicYearId: number;
  classId: number | null;
  class?: { name: string } | null;
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
export type FakeSheet = Record<string, any> & { id: string; schoolId: number; code: string };
export type FakeData = {
  exams?: FakeExam[];
  assignments?: FakeAssignment[];
  students?: { id: string; schoolId: number; classId: number; name?: string; status?: string }[];
  results?: FakeResult[];
  submissions?: { examId: number; studentId: string }[];
  assignmentSubmissions?: { assignmentId: number; studentId: string }[];
  sheets?: FakeSheet[];
  classes?: { id: number; schoolId: number; name: string; supervisorId: string | null }[];
};

type Where = Record<string, unknown>;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const matches = (row: Record<string, unknown>, where: Where): boolean =>
  Object.entries(where).every(([key, condition]) => {
    if (key === "AND") return (condition as Where[]).every((part) => matches(row, part));
    if (key === "OR") return (condition as Where[]).some((part) => matches(row, part));
    if (key === "NOT") return !matches(row, condition as Where);

    const value = row[key];
    if (isObject(condition)) {
      if ("not" in condition) return (value ?? null) !== condition.not;
      if ("isNot" in condition) return (value ?? null) !== condition.isNot;
      if ("in" in condition) return (condition.in as unknown[]).includes(value);
      // A filter on a related record.
      return isObject(value) && matches(value, condition);
    }
    return value === condition;
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

const uniqueViolation = () =>
  Object.assign(new Error("Unique constraint failed"), { code: "P2002" });

/** Returns the fake client and the stored rows, which writes change. */
export const fakeResultDb = (data: FakeData) => {
  const results = [...(data.results ?? [])];
  const sheets = [...(data.sheets ?? [])];
  const writes: { kind: "create" | "update"; row: FakeResult }[] = [];

  const finder = <T,>(rows: T[] = []) => {
    const filter = (where: Where = {}) =>
      rows.filter((row) => matches(row as Record<string, unknown>, where));
    return {
      findFirst: async ({ where }: { where?: Where }) => filter(where)[0] ?? null,
      findMany: async ({ where }: { where?: Where } = {}) => filter(where),
      count: async ({ where }: { where?: Where }) => filter(where).length,
    };
  };

  const db = {
    class: finder(data.classes),
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
    entrySheet: {
      ...finder(sheets),
      create: async ({ data: row }: { data: Omit<FakeSheet, "id"> }) => {
        if (sheets.some((sheet) => sheet.schoolId === row.schoolId && sheet.code === row.code)) {
          throw uniqueViolation();
        }
        const created = { id: `sheet_${sheets.length + 1}`, ...row } as FakeSheet;
        sheets.push(created);
        return created;
      },
    },
  } as unknown as PrismaClient;

  return { db, results, writes, sheets };
};
