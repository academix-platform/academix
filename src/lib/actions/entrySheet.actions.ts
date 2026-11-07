"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import prisma from "../prisma";
import {
  ClassResultsInput,
  SavedClassResult,
  classResultsSchema,
  saveClassResultsWith,
} from "../entrySheets/resultEntry";
import { requireActionAccess } from "./helpers";
import {
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
