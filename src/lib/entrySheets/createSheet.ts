import "server-only";
import type { PrismaClient } from "@prisma/client";
import type { ResultAccess } from "@/lib/results/manualResult";
import { AssessmentRef, loadClassEntry } from "./classEntry";
import { buildSheetRows, newSheetCode, pageCount } from "./sheetRows";

type SheetDb = Pick<
  PrismaClient,
  "exam" | "assignment" | "student" | "result" | "submission" | "assignmentSubmission" | "entrySheet"
>;

const CODE_ATTEMPTS = 5;

const isUniqueViolation = (err: unknown) =>
  typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002";

/**
 * Saves a results sheet for one assessment, listing the same students as the
 * class entry screen. Access rules come from loadClassEntry, so a teacher can
 * only print sheets for assessments they own or teach.
 */
export const createResultSheetWith = async (
  db: SheetDb,
  access: ResultAccess,
  ref: AssessmentRef,
  academicYearId: number,
  makeCode: () => string = newSheetCode,
): Promise<{ error: "notFound" | "noStudents" } | { sheetId: string; code: string; pageCount: number }> => {
  const entry = await loadClassEntry(db, access, ref, academicYearId);
  if (!entry) return { error: "notFound" };
  if (entry.rows.length === 0) return { error: "noStudents" };

  const rows = buildSheetRows(entry.rows.map((row) => ({ id: row.studentId, name: row.name })));

  for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt += 1) {
    const code = makeCode();
    try {
      const sheet = await db.entrySheet.create({
        data: {
          code,
          kind: "RESULT",
          schoolId: access.schoolId,
          academicYearId,
          classId: entry.classId,
          examId: ref.type === "exam" ? ref.id : null,
          assignmentId: ref.type === "assignment" ? ref.id : null,
          createdById: access.userId,
          rows,
        },
        select: { id: true },
      });
      return { sheetId: sheet.id, code, pageCount: pageCount(rows) };
    } catch (err) {
      // The code is already used in this school: try another one.
      if (!isUniqueViolation(err)) throw err;
    }
  }
  throw new Error("Could not find a free sheet code.");
};
