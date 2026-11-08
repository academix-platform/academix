"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentAcademicYearOrNull } from "../academicYears";
import { readSheetPhoto, sheetReadingModel } from "../ai/geminiSheetReader";
import { InvalidSheetReplyError, SheetKind } from "../ai/sheetReadingPrompt";
import { todayInTimeZone } from "../attendanceRules";
import { markSheetReadSucceeded, reserveSheetRead, sheetScanDailyLimit } from "../entrySheets/readLimit";
import {
  AttendanceSheetSaveInput,
  createAttendanceSheetWith,
  loadAttendanceSheets,
  saveAttendanceSheetWith,
  sheetUploadWindow,
} from "../entrySheets/attendanceSheet";
import { createResultSheetWith } from "../entrySheets/createSheet";
import {
  CandidateSheet,
  MAX_PHOTO_BYTES,
  PhotoReadRow,
  checkPhoto,
  matchReplyToSheet,
  rowNumbersOf,
} from "../entrySheets/photoRead";
import { loadAssessmentSheets } from "../entrySheets/printSheet";
import prisma from "../prisma";
import {
  ClassResultsInput,
  SavedClassResult,
  classResultsSchema,
  saveClassResultsWith,
} from "../entrySheets/resultEntry";
import { requireActionAccess } from "./helpers";
import {
  notifyAttendanceSaved,
  notifyGradePosted,
  notifyGradeUpdated,
  notifyParentGradePosted,
} from "./notification.actions";

export type EntrySheetActionState = {
  success: boolean;
  error: boolean;
  message?: string;
  /** The row that stopped a save, so the screen can point at it. */
  studentId?: string;
  savedCount?: number;
};

const fail = (message: string, studentId?: string): EntrySheetActionState => ({
  success: false,
  error: true,
  message,
  ...(studentId ? { studentId } : {}),
});

class RowError extends Error {
  constructor(
    message: string,
    readonly studentId: string,
  ) {
    super(message);
  }
}

const sendGradeNotifications = async (
  schoolId: number,
  input: ClassResultsInput,
  saved: SavedClassResult[],
) => {
  const where = { id: input.assessmentId, schoolId };
  const assessment =
    input.assessmentType === "exam"
      ? await prisma.exam.findFirst({ where, select: { title: true } })
      : await prisma.assignment.findFirst({ where, select: { title: true } });
  const students = await prisma.student.findMany({
    where: { schoolId, id: { in: saved.map((row) => row.studentId) } },
    select: { id: true, name: true },
  });
  const names = new Map(students.map((student) => [student.id, student.name]));

  // Same notifications as createResult and updateResult. A failed
  // notification never undoes a save that already succeeded.
  await Promise.allSettled(
    saved.flatMap((row) => {
      const grade = {
        schoolId,
        studentId: row.studentId,
        score: row.score,
        assessmentTitle: assessment?.title ?? "Assessment",
        assessmentType: input.assessmentType,
      };
      const studentName = names.get(row.studentId);
      return [
        row.replaced ? notifyGradeUpdated(grade) : notifyGradePosted(grade),
        ...(studentName ? [notifyParentGradePosted({ ...grade, studentName })] : []),
      ];
    }),
  );
};

const resultSheetSchema = z.object({
  assessmentType: z.enum(["exam", "assignment"]),
  assessmentId: z.number().int().positive(),
});

/** Saves the class list for a printable results sheet. */
export const createResultSheet = async (
  input: z.infer<typeof resultSheetSchema>,
): Promise<EntrySheetActionState & { sheetId?: string }> => {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;

  const parsed = resultSheetSchema.safeParse(input);
  if (!parsed.success) return fail("Choose an assessment.");

  const year = await getCurrentAcademicYearOrNull(access.schoolId);
  if (!year) return fail("No current academic year found.");

  try {
    const outcome = await createResultSheetWith(
      prisma,
      access,
      { type: parsed.data.assessmentType, id: parsed.data.assessmentId },
      year.id,
    );
    if ("error" in outcome) {
      return fail(
        outcome.error === "noStudents"
          ? "There are no students to list on this sheet."
          : "This assessment isn't available, or it has no class.",
      );
    }
    return { success: true, error: false, sheetId: outcome.sheetId };
  } catch (err) {
    console.error("createResultSheet failed", err);
    return fail("The sheet could not be created. Try again.");
  }
};

const attendanceSheetSchema = z.object({
  classId: z.number().int().positive(),
  date: z.string(),
});

const attendanceSheetErrors = {
  badDate: "Choose a valid date.",
  outsideYear: "This date is outside the current academic year.",
  notFound: "This class isn't available.",
  noStudents: "There are no students to list on this sheet.",
} as const;

/** Saves the class list for a printable attendance sheet for one date. */
export const createAttendanceSheet = async (
  input: z.infer<typeof attendanceSheetSchema>,
): Promise<EntrySheetActionState & { sheetId?: string }> => {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;

  const parsed = attendanceSheetSchema.safeParse(input);
  if (!parsed.success) return fail("Choose a class and a date.");

  const year = await getCurrentAcademicYearOrNull(access.schoolId);
  if (!year) return fail("No current academic year found.");

  try {
    const outcome = await createAttendanceSheetWith(prisma, access, parsed.data, year);
    if ("error" in outcome) return fail(attendanceSheetErrors[outcome.error]);
    return { success: true, error: false, sheetId: outcome.sheetId };
  } catch (err) {
    console.error("createAttendanceSheet failed", err);
    return fail("The sheet could not be created. Try again.");
  }
};

export type PhotoReadFailure =
  | "notAllowed"
  | "badRequest"
  | "notAPhoto"
  | "tooLarge"
  | "noSheets"
  | "unreadable"
  | "wrongSheet"
  | "rowsMismatch"
  | "dailyLimit"
  | "dateClosed"
  | "unavailable";

export type PhotoReadState =
  | { success: false; reason: PhotoReadFailure }
  | {
      success: true;
      sheetId: string;
      code: string;
      page: number;
      pageCount: number;
      sheetStudents: { studentId: string; name: string }[];
      rows: PhotoReadRow[];
    };

/**
 * Checks one uploaded photo and has Gemini read it against the candidate
 * sheets. The photo stays in memory and is never stored or logged.
 */
const readPhotoAgainst = async (
  schoolId: number,
  photo: FormDataEntryValue | null,
  kind: SheetKind,
  loadSheets: () => Promise<CandidateSheet[]>,
): Promise<PhotoReadState> => {
  if (!(photo instanceof Blob)) return { success: false, reason: "badRequest" };
  if (photo.size > MAX_PHOTO_BYTES) return { success: false, reason: "tooLarge" };

  const bytes = new Uint8Array(await photo.arrayBuffer());
  const checked = checkPhoto(bytes);
  if ("error" in checked) return { success: false, reason: checked.error };

  const sheets = await loadSheets();
  if (sheets.length === 0) return { success: false, reason: "noSheets" };

  // Count the read before paying for it. Until the photo is matched, the log
  // names the newest sheet it may belong to.
  let reservation;
  try {
    reservation = await reserveSheetRead(prisma, {
      schoolId,
      sheetId: sheets[0].id,
      model: sheetReadingModel(),
      limit: sheetScanDailyLimit(),
    });
  } catch (err) {
    console.error("readSheetPhoto: read log failed", err instanceof Error ? err.message : err);
    return { success: false, reason: "unavailable" };
  }
  if (!reservation.allowed) return { success: false, reason: "dailyLimit" };

  let reply;
  try {
    ({ reply } = await readSheetPhoto({
      photo: Buffer.from(bytes),
      mimeType: checked.mimeType,
      kind,
      rowNumbers: rowNumbersOf(sheets),
    }));
  } catch (err) {
    if (err instanceof InvalidSheetReplyError) return { success: false, reason: "unreadable" };
    // Log the failure, never the photo or what was read from it.
    console.error("readSheetPhoto: Gemini call failed", err instanceof Error ? err.message : err);
    return { success: false, reason: "unavailable" };
  }
  if (!reply.readable) return { success: false, reason: "unreadable" };

  const matched = matchReplyToSheet(reply, sheets);
  if ("error" in matched) return { success: false, reason: matched.error };

  // The read already worked, so a failed status update only loses the status.
  await markSheetReadSucceeded(prisma, reservation.readId, matched.sheetId).catch((err) =>
    console.error("readSheetPhoto: read log update failed", err instanceof Error ? err.message : err),
  );

  return {
    success: true,
    sheetId: matched.sheetId,
    code: matched.code,
    page: matched.page,
    pageCount: matched.pageCount,
    sheetStudents: matched.sheetStudents,
    rows: matched.rows,
  };
};

const photoRequestSchema = z.object({
  assessmentType: z.enum(["exam", "assignment"]),
  assessmentId: z.coerce.number().int().positive(),
});

/**
 * Reads one photographed page of a results sheet and returns its rows.
 * Nothing is saved: the person checks the values on screen first.
 */
export const readResultSheetPhoto = async (formData: FormData): Promise<PhotoReadState> => {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return { success: false, reason: "notAllowed" };

  const parsed = photoRequestSchema.safeParse({
    assessmentType: formData.get("assessmentType"),
    assessmentId: formData.get("assessmentId"),
  });
  if (!parsed.success) return { success: false, reason: "badRequest" };

  return readPhotoAgainst(access.schoolId, formData.get("photo"), "RESULT", () =>
    loadAssessmentSheets(prisma, access, { type: parsed.data.assessmentType, id: parsed.data.assessmentId }),
  );
};

const attendancePhotoSchema = z.object({
  classId: z.coerce.number().int().positive(),
  date: z.string(),
});

/**
 * Reads one photographed page of an attendance sheet for a class and date.
 * Nothing is saved: the person checks the rows on screen first.
 */
export const readAttendanceSheetPhoto = async (formData: FormData): Promise<PhotoReadState> => {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return { success: false, reason: "notAllowed" };

  const parsed = attendancePhotoSchema.safeParse({
    classId: formData.get("classId"),
    date: formData.get("date"),
  });
  if (!parsed.success) return { success: false, reason: "badRequest" };

  // Don't pay for a read that saveAttendanceSheet would refuse. The page hides
  // the upload outside this window, but the action must not rely on it.
  const year = await getCurrentAcademicYearOrNull(access.schoolId);
  if (!year || sheetUploadWindow(parsed.data.date, todayInTimeZone(), year) !== "open") {
    return { success: false, reason: "dateClosed" };
  }

  return readPhotoAgainst(access.schoolId, formData.get("photo"), "ATTENDANCE", () =>
    loadAttendanceSheets(prisma, access, parsed.data),
  );
};

/** Saves a whole class of results: every row, or none of them. */
export const saveClassResults = async (
  input: ClassResultsInput,
): Promise<EntrySheetActionState> => {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;

  const parsed = classResultsSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);

  let saved: SavedClassResult[];
  try {
    saved = await prisma.$transaction(
      async (tx) => {
        const outcome = await saveClassResultsWith(tx, access, parsed.data);
        // Nothing has been written when a row fails, but throwing still
        // rolls the transaction back if that ever changes.
        if ("error" in outcome) throw new RowError(outcome.error, outcome.studentId);
        return outcome.saved;
      },
      {
        // Serializable stops two saves at once from creating two results
        // for the same student.
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10_000,
        timeout: 30_000,
      },
    );
  } catch (err) {
    if (err instanceof RowError) return fail(err.message, err.studentId);
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
      return fail("These results were changed at the same time by someone else. Nothing was saved. Try again.");
    }
    console.error("saveClassResults failed", err);
    return fail("The results could not be saved. Nothing was saved. Try again.");
  }

  await sendGradeNotifications(access.schoolId, parsed.data, saved);
  revalidatePath("/list/results");
  return { success: true, error: false, savedCount: saved.length };
};

/**
 * Saves the checked rows of an attendance sheet on the sheet's date, up to
 * 7 days late: every row, or none of them. Direct attendance stays in
 * saveDailyAttendance with its today-only rule.
 */
export const saveAttendanceSheet = async (
  input: AttendanceSheetSaveInput,
): Promise<EntrySheetActionState> => {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;

  const year = await getCurrentAcademicYearOrNull(access.schoolId);
  if (!year) return fail("No current academic year found.");

  let saved: { savedCount: number; date: string };
  try {
    saved = await prisma.$transaction(
      async (tx) => {
        const outcome = await saveAttendanceSheetWith(tx, access, input, { today: todayInTimeZone(), year });
        // Throwing rolls back anything already written.
        if ("error" in outcome) throw new RowError(outcome.error, outcome.studentId ?? "");
        return outcome;
      },
      { maxWait: 10_000, timeout: 30_000 },
    );
  } catch (err) {
    if (err instanceof RowError) return fail(err.message, err.studentId || undefined);
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      (err.code === "P2002" || err.code === "P2034")
    ) {
      return fail("This attendance was changed at the same time by someone else. Nothing was saved. Try again.");
    }
    console.error("saveAttendanceSheet failed", err);
    return fail("The attendance could not be saved. Nothing was saved. Try again.");
  }

  // Same notification as direct attendance. It never undoes the save.
  await notifyAttendanceSaved({
    schoolId: access.schoolId,
    scope: "students",
    date: saved.date,
    count: saved.savedCount,
  }).catch(() => {});
  revalidatePath("/list/attendance");
  return { success: true, error: false, savedCount: saved.savedCount };
};
