import "server-only";
import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { ATTENDING_STUDENT_STATUSES, MAX_ATTENDANCE_RECORDS, isIsoDate } from "@/lib/attendanceRules";
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

/** How many days late a sheet's attendance can still be saved. */
export const SHEET_ATTENDANCE_DAYS_LATE = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

const daysBetween = (from: string, to: string) =>
  Math.round((dayOf(to).getTime() - dayOf(from).getTime()) / DAY_MS);

/**
 * The date rule for attendance saved from a sheet: today or up to 7 days
 * earlier, inside the current academic year, never in the future. Direct
 * attendance keeps its own today-only rule, attendanceDateError.
 */
export const sheetAttendanceDateError = (
  date: unknown,
  today: string,
  year: { startDate: string; endDate: string },
): string | null => {
  if (!isIsoDate(date)) return "Invalid date.";
  const daysLate = daysBetween(date, today);
  if (daysLate < 0) return "Attendance can't be saved for a future date.";
  if (daysLate > SHEET_ATTENDANCE_DAYS_LATE) {
    return "Attendance from a sheet can only be saved up to 7 days late.";
  }
  if (date < year.startDate || date > year.endDate) {
    return "This date is outside the current academic year.";
  }
  return null;
};

export const attendanceSheetSaveSchema = z.object({
  sheetId: z.string().uuid(),
  rows: z
    .array(z.object({ studentId: z.string().min(1), present: z.boolean() }))
    .min(1, "There are no rows to save.")
    .max(MAX_ATTENDANCE_RECORDS)
    .refine((rows) => new Set(rows.map((row) => row.studentId)).size === rows.length, {
      message: "A student appears twice.",
    }),
});
export type AttendanceSheetSaveInput = z.infer<typeof attendanceSheetSaveSchema>;

type SaveDb = Pick<Prisma.TransactionClient, "entrySheet" | "student" | "attendance">;

/**
 * Saves the checked rows of one attendance sheet on the sheet's date: all of
 * them, or none when any check fails. Every check runs again here, whatever
 * the screen showed. Run it inside a transaction.
 */
export const saveAttendanceSheetWith = async (
  db: SaveDb,
  access: ResultAccess,
  input: unknown,
  { today, year }: { today: string; year: AttendanceYear },
): Promise<{ error: string; studentId?: string } | { savedCount: number; date: string }> => {
  const parsed = attendanceSheetSaveSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { sheetId, rows } = parsed.data;

  const sheet = await db.entrySheet.findFirst({
    where: { id: sheetId, ...attendanceSheetAccessWhere(access) },
    select: { classId: true, date: true, academicYearId: true },
  });
  if (!sheet?.date) return { error: "Sheet not found." };
  if (sheet.academicYearId !== year.id) return { error: "This sheet is from another academic year." };

  const date = isoDateOf(sheet.date);
  const dateError = sheetAttendanceDateError(date, today, year);
  if (dateError) return { error: dateError };

  // Only current students of the sheet's class; anyone who left can't be saved.
  const allowed = await db.student.findMany({
    where: {
      id: { in: rows.map((row) => row.studentId) },
      schoolId: access.schoolId,
      classId: sheet.classId,
      status: { in: [...ATTENDING_STUDENT_STATUSES] },
    },
    select: { id: true },
  });
  const allowedIds = new Set(allowed.map((student) => student.id));
  const refused = rows.find((row) => !allowedIds.has(row.studentId));
  if (refused) {
    return {
      error: "This student is no longer in this class, so their attendance can't be saved.",
      studentId: refused.studentId,
    };
  }

  const day = dayOf(date);
  for (const row of rows) {
    await db.attendance.upsert({
      where: {
        studentId_academicYearId_date: { studentId: row.studentId, academicYearId: year.id, date: day },
      },
      update: { present: row.present },
      create: {
        schoolId: access.schoolId,
        studentId: row.studentId,
        academicYearId: year.id,
        date: day,
        present: row.present,
      },
    });
  }
  return { savedCount: rows.length, date };
};
