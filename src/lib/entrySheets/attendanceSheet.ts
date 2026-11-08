import "server-only";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { ATTENDING_STUDENT_STATUSES, isIsoDate } from "@/lib/attendanceRules";
import type { ResultAccess } from "@/lib/results/manualResult";
import { createWithFreshCode } from "./createSheet";
import type { CandidateSheet } from "./photoRead";
import { SheetRow, buildSheetRows, newSheetCode, sheetRowsSchema, splitIntoPages } from "./sheetRows";

// Attendance sheets: one class on one date. Teachers may only use classes
// they supervise, the same rule as direct attendance; admins use their school.

export type AttendanceYear = { id: number; startDate: string; endDate: string };

export type PrintableAttendanceSheet = {
  code: string;
  schoolName: string;
  className: string;
  classId: number;
  date: string;
  pages: SheetRow[][];
};

/** Classes the caller may take attendance for. */
export const attendanceClassWhere = (access: ResultAccess) => ({
  schoolId: access.schoolId,
  ...(access.role === "teacher" ? { supervisorId: access.userId } : {}),
});

export const loadAttendanceClasses = (db: Pick<PrismaClient, "class">, access: ResultAccess) =>
  db.class.findMany({
    where: attendanceClassWhere(access),
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

/** Current students of one class, in the order they are printed. */
export const loadAttendanceStudents = (
  db: Pick<PrismaClient, "student">,
  schoolId: number,
  classId: number,
) =>
  db.student.findMany({
    where: { schoolId, classId, status: { in: [...ATTENDING_STUDENT_STATUSES] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

export type AttendanceEntryRow = { studentId: string; name: string; existingPresent: boolean | null };

/** The class's current students, with what is already saved for the date. */
export const loadAttendanceEntry = async (
  db: Pick<PrismaClient, "student" | "attendance">,
  schoolId: number,
  ref: { classId: number; date: string; academicYearId: number },
): Promise<AttendanceEntryRow[]> => {
  const students = await loadAttendanceStudents(db, schoolId, ref.classId);
  const saved = await db.attendance.findMany({
    where: {
      schoolId,
      academicYearId: ref.academicYearId,
      date: dayOf(ref.date),
      studentId: { in: students.map((student) => student.id) },
    },
    select: { studentId: true, present: true },
  });
  const byStudent = new Map(saved.map((record) => [record.studentId, record.present]));
  return students.map((student) => ({
    studentId: student.id,
    name: student.name,
    existingPresent: byStudent.get(student.id) ?? null,
  }));
};

/** Stored @db.Date values come back as UTC midnight. */
export const isoDateOf = (date: Date) => date.toISOString().slice(0, 10);

export const dayOf = (date: string) => new Date(`${date}T00:00:00.000Z`);

/**
 * Saves an attendance sheet listing the class's current students. The date
 * only has to be in the academic year here; saving checks how late it is.
 */
export const createAttendanceSheetWith = async (
  db: Pick<PrismaClient, "class" | "student" | "entrySheet">,
  access: ResultAccess,
  input: { classId: number; date: string },
  year: AttendanceYear,
  makeCode: () => string = newSheetCode,
): Promise<
  | { error: "badDate" | "outsideYear" | "notFound" | "noStudents" }
  | { sheetId: string; code: string; pageCount: number }
> => {
  if (!isIsoDate(input.date)) return { error: "badDate" };
  if (input.date < year.startDate || input.date > year.endDate) return { error: "outsideYear" };

  const found = await db.class.findFirst({
    where: { id: input.classId, ...attendanceClassWhere(access) },
    select: { id: true },
  });
  if (!found) return { error: "notFound" };

  const students = await loadAttendanceStudents(db, access.schoolId, found.id);
  if (students.length === 0) return { error: "noStudents" };

  return createWithFreshCode(
    db,
    {
      kind: "ATTENDANCE",
      schoolId: access.schoolId,
      academicYearId: year.id,
      classId: found.id,
      examId: null,
      assignmentId: null,
      date: dayOf(input.date),
      createdById: access.userId,
      rows: buildSheetRows(students),
    },
    makeCode,
  );
};

/** Attendance sheets in the caller's school, and for teachers only their classes'. */
export const attendanceSheetAccessWhere = (access: ResultAccess) => ({
  schoolId: access.schoolId,
  kind: "ATTENDANCE" as const,
  ...(access.role === "teacher" ? { class: { supervisorId: access.userId } } : {}),
});

const sheetIdSchema = z.string().uuid();

/** Returns null for a sheet the caller can't use, without saying why. */
export const loadAttendanceSheetForPrint = async (
  db: Pick<PrismaClient, "entrySheet">,
  access: ResultAccess,
  sheetId: string,
): Promise<PrintableAttendanceSheet | null> => {
  if (!sheetIdSchema.safeParse(sheetId).success) return null;

  const sheet = await db.entrySheet.findFirst({
    where: { id: sheetId, ...attendanceSheetAccessWhere(access) },
    select: {
      code: true,
      classId: true,
      date: true,
      rows: true,
      school: { select: { name: true } },
      class: { select: { name: true } },
    },
  });
  if (!sheet?.date) return null;

  const rows = sheetRowsSchema.safeParse(sheet.rows);
  if (!rows.success) return null;

  return {
    code: sheet.code,
    schoolName: sheet.school.name,
    className: sheet.class.name,
    classId: sheet.classId,
    date: isoDateOf(sheet.date),
    pages: splitIntoPages(rows.data),
  };
};

/** Every attendance sheet printed for one class and date that the caller may use. */
export const loadAttendanceSheets = async (
  db: Pick<PrismaClient, "entrySheet">,
  access: ResultAccess,
  ref: { classId: number; date: string },
): Promise<CandidateSheet[]> => {
  if (!isIsoDate(ref.date)) return [];

  const sheets = await db.entrySheet.findMany({
    where: { ...attendanceSheetAccessWhere(access), classId: ref.classId, date: dayOf(ref.date) },
    select: { id: true, code: true, rows: true },
    orderBy: { createdAt: "desc" },
  });

  return sheets.flatMap((sheet) => {
    const rows = sheetRowsSchema.safeParse(sheet.rows);
    return rows.success ? [{ id: sheet.id, code: sheet.code, rows: rows.data }] : [];
  });
};
