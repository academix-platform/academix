"use server";

import { ResultSchema } from "../formValidationSchemas";
import prisma from "../prisma";
import { getAuthUser } from "../auth";
import { getCurrentAcademicYearId } from "../academicYears";
import {
  CurrentState,
  errorResult,
  parseNumericId,
  successResult,
  canTeacherManageResultAssessment,
} from "./helpers";

export const createResult = async (
  currentState: CurrentState,
  data: ResultSchema,
) => {
  const user = await getAuthUser();
  const role = user?.role ?? null;
  const userId = user?.userId ?? null;

  try {
    const academicYearId = await getCurrentAcademicYearId();

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

    await prisma.result.create({
      data: {
        score: data.score,
        studentId: data.studentId,
        examId: data.assessmentType === "exam" ? data.assessmentId : null,
        assignmentId:
          data.assessmentType === "assignment" ? data.assessmentId : null,
        academicYearId,
      },
    });

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

  const user = await getAuthUser();
  const role = user?.role ?? null;
  const userId = user?.userId ?? null;

  try {
    const assessmentYearId =
      data.assessmentType === "exam"
        ? (
            await prisma.exam.findUnique({
              where: { id: data.assessmentId },
              select: { academicYearId: true },
            })
          )?.academicYearId
        : (
            await prisma.assignment.findUnique({
              where: { id: data.assessmentId },
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
      where: { id: data.id },
      include: {
        exam: { select: { lesson: { select: { teacherId: true } } } },
        assignment: { select: { lesson: { select: { teacherId: true } } } },
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
      existingResult.exam?.lesson.teacherId !== userId &&
      existingResult.assignment?.lesson.teacherId !== userId
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

    await prisma.result.update({
      where: { id: data.id },
      data: {
        score: data.score,
        studentId: data.studentId,
        examId: data.assessmentType === "exam" ? data.assessmentId : null,
        assignmentId:
          data.assessmentType === "assignment" ? data.assessmentId : null,
        academicYearId: assessmentYearId,
      },
    });

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

  const user = await getAuthUser();
  const role = user?.role;
  const userId = user?.userId;

  try {
    const existingResult = await prisma.result.findUnique({
      where: { id },
      include: {
        exam: { select: { lesson: { select: { teacherId: true } } } },
        assignment: { select: { lesson: { select: { teacherId: true } } } },
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
      existingResult.exam?.lesson.teacherId !== userId &&
      existingResult.assignment?.lesson.teacherId !== userId
    ) {
      return {
        success: false,
        error: true,
        message: "You are not allowed to delete this result.",
      };
    }

    await prisma.result.delete({
      where: { id },
    });

    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};
