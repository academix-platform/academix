"use server";

import { AssignmentSchema } from "../formValidationSchemas";
import prisma from "../prisma";
import { getAuthUser } from "../auth";
import {
  CurrentState,
  errorResult,
  parseNumericId,
  successResult,
} from "./helpers";

export const createAssignment = async (
  currentState: CurrentState,
  data: AssignmentSchema,
) => {
  const user = await getAuthUser();
  const role = user?.role;
  const userId = user?.userId;
  try {
    const lessons = await prisma.lesson.findMany({
      where: {
        subjectId: data.subjectId,
        classId: { in: data.classIds },
        ...(role === "teacher" ? { teacherId: userId! } : {}),
      },
      select: { id: true, classId: true },
    });

    const matchedClassIds = new Set(lessons.map((lesson) => lesson.classId));
    if (lessons.length === 0) {
      return {
        success: false,
        error: true,
        message: "No lessons were found for the selected subject and classes.",
      };
    }

    if (matchedClassIds.size !== data.classIds.length) {
      return {
        success: false,
        error: true,
        message:
          "One or more selected classes do not have a lesson for that subject.",
      };
    }

    await prisma.$transaction(
      lessons.map((lesson) =>
        prisma.assignment.create({
          data: {
            title: data.title,
            startDate: data.startDate,
            endDate: data.endDate,
            lessonId: lesson.id,
            classId: lesson.classId,
            subjectId: data.subjectId,
          },
        }),
      ),
    );

    return successResult(["/list/assignments"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const updateAssignment = async (
  currentState: CurrentState,
  data: AssignmentSchema,
) => {
  if (!data.id) {
    return {
      success: false,
      error: true,
      message: "Assignment id is required.",
    };
  }

  const user = await getAuthUser();
  const role = user?.role;
  const userId = user?.userId;

  try {
    const existingAssignment = await prisma.assignment.findUnique({
      where: { id: data.id },
      select: {
        id: true,
        title: true,
        startDate: true,
        endDate: true,
        subjectId: true,
      },
    });

    if (!existingAssignment) {
      return {
        success: false,
        error: true,
        message: "The assignment you are trying to update was not found.",
      };
    }

    const lessons = await prisma.lesson.findMany({
      where: {
        subjectId: data.subjectId,
        classId: { in: data.classIds },
        ...(role === "teacher" ? { teacherId: userId! } : {}),
      },
      select: { id: true, classId: true },
    });

    const matchedClassIds = new Set(lessons.map((lesson) => lesson.classId));
    if (lessons.length === 0) {
      return {
        success: false,
        error: true,
        message: "No lessons were found for the selected subject and classes.",
      };
    }

    if (matchedClassIds.size !== data.classIds.length) {
      return {
        success: false,
        error: true,
        message:
          "One or more selected classes do not have a lesson for that subject.",
      };
    }

    const groupAssignments = await prisma.assignment.findMany({
      where: {
        title: existingAssignment.title,
        startDate: existingAssignment.startDate,
        endDate: existingAssignment.endDate,
        subjectId: existingAssignment.subjectId,
        ...(role === "teacher" ? { lesson: { teacherId: userId! } } : {}),
      },
      select: { id: true, classId: true },
    });

    const selectedLessonsByClass = new Map<
      number,
      { id: number; classId: number }
    >();
    for (const lesson of lessons) {
      selectedLessonsByClass.set(lesson.classId, lesson);
    }

    await prisma.$transaction(async (tx) => {
      for (const assignment of groupAssignments) {
        if (
          assignment.classId &&
          !selectedLessonsByClass.has(assignment.classId)
        ) {
          await tx.assignment.delete({ where: { id: assignment.id } });
        }
      }

      for (const [classId, lesson] of selectedLessonsByClass) {
        const existingClassAssignment = groupAssignments.find(
          (assignment) => assignment.classId === classId,
        );

        if (existingClassAssignment) {
          await tx.assignment.update({
            where: { id: existingClassAssignment.id },
            data: {
              title: data.title,
              startDate: data.startDate,
              endDate: data.endDate,
              lessonId: lesson.id,
              classId,
              subjectId: data.subjectId,
            },
          });
        } else {
          await tx.assignment.create({
            data: {
              title: data.title,
              startDate: data.startDate,
              endDate: data.endDate,
              lessonId: lesson.id,
              classId,
              subjectId: data.subjectId,
            },
          });
        }
      }
    });

    return successResult(["/list/assignments"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const deleteAssignment = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = parseNumericId(data.get("id"));
  if (!id) {
    return { success: false, error: true, message: "Invalid assignment id." };
  }

  const user = await getAuthUser();
  const role = user?.role;
  const userId = user?.userId;
  try {
    if (role === "teacher") {
      const teacherAssignment = await prisma.assignment.findFirst({
        where: { id, lesson: { teacherId: userId! } },
        select: { id: true },
      });

      if (!teacherAssignment) {
        return {
          success: false,
          error: true,
          message: "You are not allowed to delete this assignment.",
        };
      }
    }

    await prisma.assignment.delete({
      where: { id },
    });

    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};
