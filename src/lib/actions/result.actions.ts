"use server";

import { notifyGradePosted, notifyParentGradePosted, notifyGradeUpdated } from "./notification.actions";
import { ResultSchema } from "../formValidationSchemas";
import prisma from "../prisma";
import {
  CurrentState,
  getRequiredAcademicYearId,
  errorResult,
  parseNumericId,
  requireActionAccess,
  successResult,
  canTeacherManageResultAssessment,
} from "./helpers";

export const createResult = async (
  currentState: CurrentState,
  data: ResultSchema,
) => {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;
  const role = access.role ?? null;
  const userId = access.userId ?? null;

  try {
    const academicYearId = await getRequiredAcademicYearId(access.schoolId);

    const isAllowed = await canTeacherManageResultAssessment({
      role,
      userId,
      assessmentType: data.assessmentType,
      assessmentId: data.assessmentId,
    });

    if (!isAllowed) {
      return {
        success: false,
        error: true,
        message: "You are not allowed to create results for this assessment.",
      };
    }

    const result = await prisma.result.create({
      data: {
        score: data.score,
        schoolId: access.schoolId,
        studentId: data.studentId,
        examId: data.assessmentType === "exam" ? data.assessmentId : null,
        assignmentId:
          data.assessmentType === "assignment" ? data.assessmentId : null,
        academicYearId,
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
  data: ResultSchema,
) => {
  if (!data.id) {
    return { success: false, error: true, message: "Result id is required." };
  }

  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;
  const role = access.role ?? null;
  const userId = access.userId ?? null;

  try {
    const assessmentYearId =
      data.assessmentType === "exam"
        ? (
            await prisma.exam.findUnique({
              where: { id: data.assessmentId, schoolId: access.schoolId },
              select: { academicYearId: true },
            })
          )?.academicYearId
        : (
            await prisma.assignment.findUnique({
              where: { id: data.assessmentId, schoolId: access.schoolId },
              select: { academicYearId: true },
            })
          )?.academicYearId;

    if (!assessmentYearId) {
      return {
        success: false,
        error: true,
        message: "Selected assessment was not found.",
      };
    }

    const existingResult = await prisma.result.findUnique({
      where: { id: data.id, schoolId: access.schoolId },
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

    const isAllowed = await canTeacherManageResultAssessment({
      role,
      userId,
      assessmentType: data.assessmentType,
      assessmentId: data.assessmentId,
    });

    if (!isAllowed) {
      return {
        success: false,
        error: true,
        message: "You are not allowed to assign this assessment.",
      };
    }

    const updated = await prisma.result.updateMany({
      where: { id: data.id, schoolId: access.schoolId },
      data: {
        score: data.score,
        studentId: data.studentId,
        examId: data.assessmentType === "exam" ? data.assessmentId : null,
        assignmentId:
          data.assessmentType === "assignment" ? data.assessmentId : null,
        academicYearId: assessmentYearId,
      },
    });
    if (updated.count === 0) {
      return { success: false, error: true, message: "Result not found." };
    }

    // ✅ إشعار الطالب والولي بتحديث الدرجة
    const updatedResult = await prisma.result.findUnique({
      where: { id: data.id },
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