"use server";
import { clerkClient } from "@clerk/nextjs/server";

import { z } from "zod";

import { aiModel } from "../ai/geminiModel";
import { mapColumns, readPeopleFile } from "../ai/geminiPeopleReader";
import type { PeopleReplyRow } from "../ai/peopleReadingPrompt";
import { MAX_PHOTO_BYTES } from "../entrySheets/photoRead";
import { sheetScanDailyLimit } from "../entrySheets/readLimit";
import { sendAccountEmail } from "../mail";
import prisma from "../prisma";
import { columnDescriptionsSchema, type ColumnChoice } from "../peopleImport/columns";
import { MAX_PDF_BYTES } from "../peopleImport/fileCheck";
import { reviewSchema, saveBatchSchema } from "../peopleImport/importInput";
import { readPeopleFileWith, type ReadFileProblem } from "../peopleImport/readFile";
import { reviewStudentRows, type ReviewedStudentRow } from "../peopleImport/rowFlags";
import { loadStudentContext, saveStudentBatchWith, type SaveRowResult, type StopReason } from "../peopleImport/saveBatch";
import { loadTeacherContext, saveTeacherBatchWith } from "../peopleImport/saveTeacherBatch";
import { reviewTeacherRows, type ReviewedTeacherRow, type SubjectLabel } from "../peopleImport/teacherFlags";
import { errorResult, getRequiredAcademicYearId, requireActionAccess, successResult } from "./helpers";

// Thin actions for the people import: check access first, check the input,
// and call the rules in src/lib/peopleImport, scoped to the admin's school.

/**
 * Asks Groq which field each spreadsheet column holds. Only the headers and
 * column descriptions arrive here, and the schema refuses anything else, so
 * no cell value can reach Groq. A failure leaves every column for the admin
 * to choose.
 */
export const mapImportColumns = async (
  kind: unknown,
  columns: unknown,
): Promise<{ success: boolean; error: boolean; message?: string; mapping?: ColumnChoice[] }> => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  const parsedKind = z.enum(["students", "teachers"]).safeParse(kind);
  const parsedColumns = columnDescriptionsSchema.safeParse(columns);
  if (!parsedKind.success || !parsedColumns.success) {
    return { success: false, error: true, message: "The columns sent can't be read." };
  }

  try {
    const { mapping } = await mapColumns(parsedKind.data, parsedColumns.data);
    return { success: true, error: false, mapping };
  } catch (err) {
    // The error's name only: the request held headers, which are the school's data.
    console.error("mapImportColumns: column reading failed", err instanceof Error ? err.name : "unknown error");
    return { success: false, error: true, message: "The columns couldn't be read automatically." };
  }
};

/**
 * Reviews every row of a students file against the admin's school, for the
 * review screen. Nothing is saved. Saving checks every row again.
 */
export const reviewStudentImport = async (
  rows: unknown,
): Promise<{
  success: boolean;
  error: boolean;
  message?: string;
  rows?: ReviewedStudentRow[];
  classes?: { id: number; name: string }[];
}> => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  const parsed = reviewSchema.safeParse(rows);
  if (!parsed.success) return { success: false, error: true, message: "The rows sent can't be reviewed." };

  try {
    const context = await loadStudentContext(prisma, access.schoolId);
    const decisions = Object.fromEntries(parsed.data.map((row) => [row.sourceRow, row.decision ?? {}]));
    return {
      success: true,
      error: false,
      rows: reviewStudentRows(parsed.data, context, decisions),
      classes: context.classes.map(({ id, name }) => ({ id, name })),
    };
  } catch (err) {
    return errorResult(err);
  }
};

/**
 * Saves one batch of student and parent rows. The rows are checked again
 * here, whatever the review screen showed. The new logins in the reply are
 * shown to the admin once and never stored.
 */
export const saveStudentImportBatch = async (
  rows: unknown,
): Promise<{ success: boolean; error: boolean; message?: string; results?: SaveRowResult[]; stopped?: StopReason }> => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  const parsed = saveBatchSchema.safeParse(rows);
  if (!parsed.success) return { success: false, error: true, message: "The rows sent can't be saved." };

  try {
    const { results, stopped } = await saveStudentBatchWith(
      {
        db: prisma,
        clerk: (await clerkClient()).users,
        academicYearId: getRequiredAcademicYearId,
        sendEmail: sendAccountEmail,
      },
      access.schoolId,
      parsed.data,
    );
    return { ...successResult(["/list/students", "/list/parents"]), results, stopped };
  } catch (err) {
    return errorResult(err);
  }
};

/**
 * Reviews every row of a teachers file against the admin's school, for the
 * review screen. Nothing is saved. Saving checks every row again.
 */
export const reviewTeacherImport = async (
  rows: unknown,
): Promise<{
  success: boolean;
  error: boolean;
  message?: string;
  rows?: ReviewedTeacherRow[];
  subjects?: SubjectLabel[];
}> => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  const parsed = reviewSchema.safeParse(rows);
  if (!parsed.success) return { success: false, error: true, message: "The rows sent can't be reviewed." };

  try {
    const context = await loadTeacherContext(prisma, access.schoolId);
    const decisions = Object.fromEntries(parsed.data.map((row) => [row.sourceRow, row.decision ?? {}]));
    return {
      success: true,
      error: false,
      rows: reviewTeacherRows(parsed.data, context, decisions),
      subjects: context.subjects.map(({ id, name, level }) => ({ id, name, level })),
    };
  } catch (err) {
    return errorResult(err);
  }
};

/**
 * Saves one batch of teacher rows. The rows are checked again here, whatever
 * the review screen showed. The new logins in the reply are shown to the
 * admin once and never stored.
 */
export const saveTeacherImportBatch = async (
  rows: unknown,
): Promise<{ success: boolean; error: boolean; message?: string; results?: SaveRowResult[]; stopped?: StopReason }> => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  const parsed = saveBatchSchema.safeParse(rows);
  if (!parsed.success) return { success: false, error: true, message: "The rows sent can't be saved." };

  try {
    const { results, stopped } = await saveTeacherBatchWith(
      { db: prisma, clerk: (await clerkClient()).users, sendEmail: sendAccountEmail },
      access.schoolId,
      parsed.data,
    );
    return { ...successResult(["/list/teachers"]), results, stopped };
  } catch (err) {
    return errorResult(err);
  }
};

/**
 * Has Gemini read the people listed in one uploaded photo or PDF. The file
 * is checked by its own bytes, each page counts toward the school's daily
 * read limit, and the file is never stored or logged: it lives in memory
 * for this call only. Nothing is saved. The rows go to the review screen.
 */
export const readImportFile = async (
  formData: FormData,
): Promise<{ success: boolean; error: boolean; message?: string; problem?: ReadFileProblem; rows?: PeopleReplyRow[] }> => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  const kind = z.enum(["students", "teachers"]).safeParse(formData.get("kind"));
  const file = formData.get("file");
  if (!kind.success || !(file instanceof Blob)) return { success: false, error: true, problem: "notSupported" };
  // Checked before the bytes are read into memory. Each type's own limit is checked after.
  if (file.size > Math.max(MAX_PDF_BYTES, MAX_PHOTO_BYTES)) return { success: false, error: true, problem: "tooLarge" };

  const result = await readPeopleFileWith(
    { db: prisma, read: readPeopleFile, model: aiModel(), limit: sheetScanDailyLimit() },
    access.schoolId,
    kind.data,
    new Uint8Array(await file.arrayBuffer()),
  );
  return result.ok
    ? { success: true, error: false, rows: result.rows }
    : { success: false, error: true, problem: result.problem };
};
