import "server-only";
import { z } from "zod";
import {
  ManualResultDb,
  ResultAccess,
  hasOnlineSubmission,
  resolveManualResult,
} from "@/lib/results/manualResult";

// Saving a whole class of results at once. Every row goes through the same
// rules as createResult, and all rows are checked before anything is written.

export const MAX_CLASS_ROWS = 200;

export const classResultsSchema = z
  .object({
    assessmentType: z.enum(["exam", "assignment"]),
    assessmentId: z.number().int().positive(),
    rows: z
      .array(
        z.object({
          studentId: z.string().min(1),
          score: z.number().finite().min(0),
          /** The person accepted replacing this student's existing result. */
          replace: z.boolean(),
        }),
      )
      .min(1, { message: "There are no marks to save." })
      .max(MAX_CLASS_ROWS, { message: `A class can have at most ${MAX_CLASS_ROWS} rows.` }),
  })
  .refine(
    ({ rows }) => new Set(rows.map((row) => row.studentId)).size === rows.length,
    { message: "A student appears more than once." },
  );

export type ClassResultsInput = z.infer<typeof classResultsSchema>;

export type SavedClassResult = { studentId: string; score: number; replaced: boolean };

export type ClassResultsOutcome =
  | { error: string; studentId: string }
  | { saved: SavedClassResult[] };

const ONLINE_SUBMISSION_MESSAGE =
  "This student handed this work in online. Grade and publish it from its submissions page.";

/**
 * Checks every row, then writes them. Returns the first row's error without
 * writing anything. Call it inside a transaction so a failed write also
 * leaves nothing behind.
 */
export const saveClassResultsWith = async (
  db: ManualResultDb,
  access: ResultAccess,
  input: ClassResultsInput,
): Promise<ClassResultsOutcome> => {
  const isExam = input.assessmentType === "exam";
  const assessmentRef = isExam
    ? { examId: input.assessmentId }
    : { assignmentId: input.assessmentId };

  const plan = [];
  for (const row of input.rows) {
    const data = {
      studentId: row.studentId,
      score: row.score,
      assessmentType: input.assessmentType,
      assessmentId: input.assessmentId,
    };

    const existing = await db.result.findFirst({
      where: { schoolId: access.schoolId, studentId: row.studentId, ...assessmentRef },
      select: { id: true },
    });

    // Assessment ownership is checked first, so an error about an existing
    // result never reveals results on someone else's assessment.
    const target = await resolveManualResult(db, access, data, existing?.id);
    if ("error" in target) return { error: target.error, studentId: row.studentId };

    if (existing && !row.replace) {
      return {
        error: "This student already has a result for this assessment.",
        studentId: row.studentId,
      };
    }

    if (await hasOnlineSubmission(db, data)) {
      return { error: ONLINE_SUBMISSION_MESSAGE, studentId: row.studentId };
    }

    plan.push({ row, target, existingId: existing?.id });
  }

  const saved: SavedClassResult[] = [];
  for (const { row, target, existingId } of plan) {
    if (existingId) {
      await db.result.update({
        where: { id: existingId },
        data: { score: row.score, ...target },
      });
    } else {
      await db.result.create({
        data: {
          score: row.score,
          schoolId: access.schoolId,
          studentId: row.studentId,
          ...target,
        },
      });
    }
    saved.push({ studentId: row.studentId, score: row.score, replaced: Boolean(existingId) });
  }

  return { saved };
};
