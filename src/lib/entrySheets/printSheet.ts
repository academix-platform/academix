import "server-only";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import {
  ResultAccess,
  assessmentOwnerWhere,
  examMaxScore,
} from "@/lib/results/manualResult";
import type { AssessmentRef } from "./classEntry";
import type { CandidateSheet } from "./photoRead";
import { SheetRow, sheetRowsSchema, splitIntoPages } from "./sheetRows";

export type PrintableSheet = {
  code: string;
  schoolName: string;
  className: string;
  title: string;
  maxScore: number;
  /** The exam or assignment the sheet was printed for. */
  assessment: AssessmentRef;
  pages: SheetRow[][];
};

const sheetIdSchema = z.string().uuid();

/** Results sheets in the caller's school, and for teachers only their own assessments'. */
const resultSheetAccessWhere = (access: ResultAccess) => {
  const owner = assessmentOwnerWhere(access);
  return {
    schoolId: access.schoolId,
    kind: "RESULT" as const,
    ...(access.role === "teacher" ? { OR: [{ exam: owner }, { assignment: owner }] } : {}),
  };
};

/** Every results sheet printed for one assessment that the caller may use. */
export const loadAssessmentSheets = async (
  db: Pick<PrismaClient, "entrySheet">,
  access: ResultAccess,
  ref: AssessmentRef,
): Promise<CandidateSheet[]> => {
  const sheets = await db.entrySheet.findMany({
    where: {
      ...resultSheetAccessWhere(access),
      ...(ref.type === "exam" ? { examId: ref.id } : { assignmentId: ref.id }),
    },
    select: { id: true, code: true, rows: true },
    orderBy: { createdAt: "desc" },
  });

  return sheets.flatMap((sheet) => {
    const rows = sheetRowsSchema.safeParse(sheet.rows);
    return rows.success ? [{ id: sheet.id, code: sheet.code, rows: rows.data }] : [];
  });
};

/**
 * Loads a results sheet for printing. A teacher only gets sheets for
 * assessments they own or teach, and nobody gets another school's sheets.
 * Returns null otherwise, without saying which check failed.
 */
export const loadSheetForPrint = async (
  db: Pick<PrismaClient, "entrySheet">,
  access: ResultAccess,
  sheetId: string,
): Promise<PrintableSheet | null> => {
  if (!sheetIdSchema.safeParse(sheetId).success) return null;

  const sheet = await db.entrySheet.findFirst({
    where: { id: sheetId, ...resultSheetAccessWhere(access) },
    select: {
      code: true,
      rows: true,
      school: { select: { name: true } },
      class: { select: { name: true } },
      examId: true,
      assignmentId: true,
      exam: { select: { title: true, questions: { select: { points: true } } } },
      assignment: { select: { title: true, maxScore: true } },
    },
  });
  if (!sheet) return null;

  const rows = sheetRowsSchema.safeParse(sheet.rows);
  const assessment = sheet.exam
    ? { title: sheet.exam.title, maxScore: examMaxScore(sheet.exam.questions) }
    : sheet.assignment;
  const ref = sheet.examId
    ? ({ type: "exam", id: sheet.examId } as const)
    : sheet.assignmentId
      ? ({ type: "assignment", id: sheet.assignmentId } as const)
      : null;
  if (!rows.success || !assessment || !ref) return null;

  return {
    code: sheet.code,
    schoolName: sheet.school.name,
    className: sheet.class.name,
    title: assessment.title,
    maxScore: assessment.maxScore,
    assessment: ref,
    pages: splitIntoPages(rows.data),
  };
};
