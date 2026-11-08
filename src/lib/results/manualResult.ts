import "server-only";
import type { Prisma } from "@prisma/client";
import type { ResultSchema } from "../formValidationSchemas";

// Rules shared by single result entry (createResult, updateResult) and whole
// class entry. This is a plain module, not a "use server" file, so none of it
// can be called from the browser. `db` is prisma or a transaction client.

export type ResultAccess = { userId: string; role: string; schoolId: number };

export type ManualResultDb = Pick<
  Prisma.TransactionClient,
  "exam" | "assignment" | "student" | "result" | "submission" | "assignmentSubmission"
>;

// Legacy exams created without questions are graded out of 100.
const DEFAULT_MAX_SCORE = 100;

/** A teacher may only use assessments they own or teach; admins use any. */
export const assessmentOwnerWhere = (access: ResultAccess) =>
  access.role === "teacher"
    ? { OR: [{ teacherId: access.userId }, { lesson: { teacherId: access.userId } }] }
    : {};

export const examMaxScore = (questions: { points: number }[]) =>
  questions.length > 0
    ? questions.reduce((sum, q) => sum + q.points, 0)
    : DEFAULT_MAX_SCORE;

/**
 * Checks a manually entered result against its assessment and student, all
 * within the caller's school. Returns the fields to store, or an error.
 */
export const resolveManualResult = async (
  db: ManualResultDb,
  access: ResultAccess,
  data: ResultSchema,
  existingResultId?: number,
): Promise<
  | { error: string }
  | { academicYearId: number; examId: number | null; assignmentId: number | null }
> => {
  const isExam = data.assessmentType === "exam";
  const where = {
    id: data.assessmentId,
    schoolId: access.schoolId,
    ...assessmentOwnerWhere(access),
  };

  const assessment = isExam
    ? await db.exam
        .findFirst({
          where,
          select: {
            academicYearId: true,
            classId: true,
            lesson: { select: { classId: true } },
            questions: { select: { points: true } },
          },
        })
        .then(
          (exam) =>
            exam && {
              academicYearId: exam.academicYearId,
              classId: exam.classId ?? exam.lesson?.classId ?? null,
              maxScore: examMaxScore(exam.questions),
            },
        )
    : await db.assignment
        .findFirst({
          where,
          select: {
            academicYearId: true,
            classId: true,
            lesson: { select: { classId: true } },
            maxScore: true,
          },
        })
        .then(
          (assignment) =>
            assignment && {
              academicYearId: assignment.academicYearId,
              classId: assignment.classId ?? assignment.lesson?.classId ?? null,
              maxScore: assignment.maxScore,
            },
        );

  if (!assessment) {
    return { error: "Selected assessment was not found." };
  }

  const student = await db.student.findFirst({
    where: { id: data.studentId, schoolId: access.schoolId },
    select: { classId: true },
  });

  if (!student) {
    return { error: "Selected student was not found." };
  }

  if (assessment.classId !== null && student.classId !== assessment.classId) {
    return { error: "This student is not in the class of this assessment." };
  }

  if (data.score > assessment.maxScore) {
    return { error: `Score cannot be greater than ${assessment.maxScore}.` };
  }

  const assessmentRef = isExam
    ? { examId: data.assessmentId }
    : { assignmentId: data.assessmentId };

  const duplicate = await db.result.findFirst({
    where: {
      schoolId: access.schoolId,
      studentId: data.studentId,
      ...assessmentRef,
      ...(existingResultId ? { NOT: { id: existingResultId } } : {}),
    },
    select: { id: true },
  });

  if (duplicate) {
    return { error: "This student already has a result for this assessment." };
  }

  return {
    academicYearId: assessment.academicYearId,
    examId: isExam ? data.assessmentId : null,
    assignmentId: isExam ? null : data.assessmentId,
  };
};

/**
 * Work handed in online is graded and published from its submissions page;
 * a manual result next to it would bypass publishing.
 */
export const hasOnlineSubmission = async (db: ManualResultDb, data: ResultSchema) => {
  const count =
    data.assessmentType === "exam"
      ? await db.submission.count({
          where: { examId: data.assessmentId, studentId: data.studentId },
        })
      : await db.assignmentSubmission.count({
          where: { assignmentId: data.assessmentId, studentId: data.studentId },
        });
  return count > 0;
};
