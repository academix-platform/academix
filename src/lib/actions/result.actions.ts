"use server";

import { notifyGradePosted, notifyParentGradePosted, notifyGradeUpdated } from "./notification.actions";
import { resultSchema, ResultSchema } from "../formValidationSchemas";
import prisma from "../prisma";
import {
  CurrentState,
  errorResult,
  parseNumericId,
  requireActionAccess,
  successResult,
} from "./helpers";

type ResultAccess = { userId: string; role: string; schoolId: number };

// Legacy exams created without questions are graded out of 100.
const DEFAULT_MAX_SCORE = 100;

const assessmentOwnerWhere = (access: ResultAccess) =>
  access.role === "teacher"
    ? { OR: [{ teacherId: access.userId }, { lesson: { teacherId: access.userId } }] }
    : {};

/**
 * Checks a manually entered result against its assessment and student, all
 * within the caller's school. Returns the fields to store, or an error.
 */
const resolveManualResult = async (
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
    ? await prisma.exam
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
              maxScore:
                exam.questions.length > 0
                  ? exam.questions.reduce((sum, q) => sum + q.points, 0)
                  : DEFAULT_MAX_SCORE,
            },
        )
    : await prisma.assignment
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

  const student = await prisma.student.findFirst({
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

  const duplicate = await prisma.result.findFirst({
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
const hasOnlineSubmission = async (data: ResultSchema) => {
  const count =
    data.assessmentType === "exam"
      ? await prisma.submission.count({
          where: { examId: data.assessmentId, studentId: data.studentId },
        })
      : await prisma.assignmentSubmission.count({
          where: { assignmentId: data.assessmentId, studentId: data.studentId },
        });
  return count > 0;
};

export const createResult = async (
  currentState: CurrentState,
  input: ResultSchema,
) => {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;

  const parsed = resultSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: true, message: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  try {
    const target = await resolveManualResult(access, data);
    if ("error" in target) {
      return { success: false, error: true, message: target.error };
    }

    if (await hasOnlineSubmission(data)) {
      return {
        success: false,
        error: true,
        message:
          "This student handed this work in online. Grade and publish it from its submissions page.",
      };
    }

    const result = await prisma.result.create({
      data: {
        score: data.score,
        schoolId: access.schoolId,
        studentId: data.studentId,
        ...target,
      },
      select: {
        studentId: true,
        schoolId: true,
        score: true,
        exam: { select: { title: true } },
        assignment: { select: { title: true } },
      },
    });

    // ✅ إشعار الطالب بالدرجة
    const assessmentTitle = result.exam?.title ?? result.assignment?.title ?? "Assessment";
    await notifyGradePosted({
      schoolId: access.schoolId,
      studentId: result.studentId,
      score: result.score,
      assessmentTitle,
      assessmentType: data.assessmentType,
    }).catch(() => {});

    // ✅ إشعار الولي بالدرجة
    const studentData = await prisma.student.findUnique({
      where: { id: result.studentId },
      select: { name: true },
    });
    if (studentData) {
      await notifyParentGradePosted({
        schoolId: access.schoolId,
        studentId: result.studentId,
        studentName: studentData.name,
        score: result.score,
        assessmentTitle,
        assessmentType: data.assessmentType,
      }).catch(() => {});
    }

    return successResult(["/list/results"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const updateResult = async (
  currentState: CurrentState,
  input: ResultSchema,
) => {
  if (!input.id) {
    return { success: false, error: true, message: "Result id is required." };
  }

  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;
  const role = access.role ?? null;
  const userId = access.userId ?? null;

  const parsed = resultSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: true, message: parsed.error.issues[0].message };
  }
  const data = parsed.data;
  const resultId = input.id;

  try {
    const existingResult = await prisma.result.findUnique({
      where: { id: resultId, schoolId: access.schoolId },
      include: {
        exam: {
          select: {
            teacherId: true,
            lesson: { select: { teacherId: true } },
          },
        },
        assignment: {
          select: {
            teacherId: true,
            lesson: { select: { teacherId: true } },
          },
        },
      },
    });

    if (!existingResult) {
      return {
        success: false,
        error: true,
        message: "The result you are trying to update was not found.",
      };
    }

    if (
      role === "teacher" &&
      existingResult.exam?.teacherId !== userId &&
      existingResult.exam?.lesson?.teacherId !== userId &&
      existingResult.assignment?.teacherId !== userId &&
      existingResult.assignment?.lesson?.teacherId !== userId
    ) {
      return {
        success: false,
        error: true,
        message: "You are not allowed to update this result.",
      };
    }

    if (role !== "admin" && role !== "teacher") {
      return {
        success: false,
        error: true,
        message: "You are not allowed to update results.",
      };
    }

    const target = await resolveManualResult(access, data, resultId);
    if ("error" in target) {
      return { success: false, error: true, message: target.error };
    }

    const updated = await prisma.result.updateMany({
      where: { id: resultId, schoolId: access.schoolId },
      data: {
        score: data.score,
        studentId: data.studentId,
        ...target,
      },
    });
    if (updated.count === 0) {
      return { success: false, error: true, message: "Result not found." };
    }

    // ✅ إشعار الطالب والولي بتحديث الدرجة
    const updatedResult = await prisma.result.findUnique({
      where: { id: resultId },
      select: {
        studentId: true,
        score: true,
        exam: { select: { title: true } },
        assignment: { select: { title: true } },
      },
    });
    if (updatedResult) {
      const assessmentTitle = updatedResult.exam?.title ?? updatedResult.assignment?.title ?? "Assessment";
      await notifyGradeUpdated({
        schoolId: access.schoolId,
        studentId: updatedResult.studentId,
        score: updatedResult.score,
        assessmentTitle,
        assessmentType: data.assessmentType,
      }).catch(() => {});

      const studentData = await prisma.student.findUnique({
        where: { id: updatedResult.studentId },
        select: { name: true },
      });
      if (studentData) {
        await notifyParentGradePosted({
          schoolId: access.schoolId,
          studentId: updatedResult.studentId,
          studentName: studentData.name,
          score: updatedResult.score,
          assessmentTitle,
          assessmentType: data.assessmentType,
        }).catch(() => {});
      }
    }

    return successResult(["/list/results"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const deleteResult = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = parseNumericId(data.get("id"));
  if (!id)
    return { success: false, error: true, message: "Invalid result id." };

  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;
  const role = access.role;
  const userId = access.userId;

  try {
    const existingResult = await prisma.result.findUnique({
      where: { id, schoolId: access.schoolId },
      include: {
        exam: {
          select: {
            teacherId: true,
            lesson: { select: { teacherId: true } },
          },
        },
        assignment: {
          select: {
            teacherId: true,
            lesson: { select: { teacherId: true } },
          },
        },
      },
    });

    if (!existingResult) {
      return {
        success: false,
        error: true,
        message: "The result you are trying to delete was not found.",
      };
    }

    if (role !== "admin" && role !== "teacher") {
      return {
        success: false,
        error: true,
        message: "You are not allowed to delete results.",
      };
    }

    if (
      role === "teacher" &&
      existingResult.exam?.teacherId !== userId &&
      existingResult.exam?.lesson?.teacherId !== userId &&
      existingResult.assignment?.teacherId !== userId &&
      existingResult.assignment?.lesson?.teacherId !== userId
    ) {
      return {
        success: false,
        error: true,
        message: "You are not allowed to delete this result.",
      };
    }

    const deleted = await prisma.result.deleteMany({
      where: { id, schoolId: access.schoolId },
    });
    if (deleted.count === 0) {
      return { success: false, error: true, message: "Result not found." };
    }

    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};
