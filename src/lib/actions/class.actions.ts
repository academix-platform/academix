"use server";

import { ClassSchema, classSchema } from "../formValidationSchemas";
import prisma from "../prisma";
import { getCurrentAcademicYearIdOrNull } from "../academicYears";
import {
  CurrentState,
  ensureAdminAccess,
  errorResult,
  deleteLessonGraph,
  parseNumericId,
  successResult,
} from "./helpers";

export type ClassDeletePayload =
  | {
      classId: number;
    }
  | {
      classId: number;
      strategy: "existing";
      targetClassId: number;
    }
  | {
      classId: number;
      strategy: "new";
      newClass: ClassSchema;
    }
  | FormData;

export const createClass = async (
  currentState: CurrentState,
  data: ClassSchema,
) => {
  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  try {
    await prisma.class.create({
      data,
    });

    return successResult(["/list/classes"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const updateClass = async (
  currentState: CurrentState,
  data: ClassSchema,
) => {
  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  if (!data.id) {
    return { success: false, error: true, message: "Class id is required." };
  }

  try {
    await prisma.class.update({
      where: { id: data.id },
      data,
    });

    return successResult(["/list/classes"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const deleteClass = async (
  currentState: CurrentState,
  data: ClassDeletePayload,
) => {
  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  const currentAcademicYearId = await getCurrentAcademicYearIdOrNull();

  const isFormDataPayload = data instanceof FormData;
  const classId = isFormDataPayload
    ? parseNumericId(data.get("id"))
    : data.classId;

  if (!classId) {
    return { success: false, error: true, message: "Invalid class id." };
  }

  try {
    const sourceClass = await prisma.class.findUnique({
      where: { id: classId },
      select: { id: true, gradeId: true, name: true },
    });

    if (!sourceClass) {
      return { success: false, error: true, message: "Class not found." };
    }

    if (isFormDataPayload || !("strategy" in data)) {
      const [studentCount, lessons] = await prisma.$transaction([
        prisma.student.count({ where: { classId } }),
        prisma.lesson.findMany({
          where: { classId },
          select: { id: true },
        }),
      ]);

      if (studentCount > 0) {
        return {
          success: false,
          error: true,
          message:
            "This class still has students assigned. Use the reassignment modal before deleting the class.",
        };
      }

      await prisma.$transaction(async (tx) => {
        if (lessons.length > 0) {
          await deleteLessonGraph(
            tx,
            lessons.map((lesson) => lesson.id),
          );
        }

        await tx.studentAcademicYear.updateMany({
          where: { classId },
          data: { classId: null },
        });

        await tx.exam.updateMany({
          where: { classId },
          data: { classId: null },
        });

        await tx.assignment.updateMany({
          where: { classId },
          data: { classId: null },
        });

        await tx.class.delete({
          where: { id: classId },
        });
      });

      return successResult();
    }

    let targetClassId: number;
    let targetGradeId: number;

    if (data.strategy === "existing") {
      const targetClass = await prisma.class.findUnique({
        where: { id: data.targetClassId },
        select: { id: true, gradeId: true, capacity: true },
      });

      if (!targetClass) {
        return {
          success: false,
          error: true,
          message: "The selected target class was not found.",
        };
      }

      const sourceStudentCount = await prisma.student.count({
        where: { classId },
      });
      const targetStudentCount = await prisma.student.count({
        where: { classId: targetClass.id },
      });

      if (targetStudentCount + sourceStudentCount > targetClass.capacity) {
        return {
          success: false,
          error: true,
          message: "The selected class does not have enough capacity.",
        };
      }

      targetClassId = targetClass.id;
      targetGradeId = targetClass.gradeId;
    } else {
      const parsedClass = classSchema.safeParse(data.newClass);

      if (!parsedClass.success) {
        return {
          success: false,
          error: true,
          message:
            parsedClass.error.issues[0]?.message ??
            "Invalid class information.",
        };
      }

      const sourceStudentCount = await prisma.student.count({
        where: { classId },
      });

      if (parsedClass.data.capacity < sourceStudentCount) {
        return {
          success: false,
          error: true,
          message:
            "The new class capacity must be large enough for the transferred students.",
        };
      }

      const createdClass = await prisma.class.create({
        data: parsedClass.data,
      });

      targetClassId = createdClass.id;
      targetGradeId = createdClass.gradeId;
    }

    const lessonIds = await prisma.lesson.findMany({
      where: { classId },
      select: { id: true },
    });

    const sourceStudentCount = await prisma.student.count({
      where: { classId },
    });

    await prisma.$transaction(async (tx) => {
      if (sourceStudentCount > 0) {
        await tx.student.updateMany({
          where: { classId },
          data: {
            classId: targetClassId,
            gradeId: targetGradeId,
          },
        });

        if (currentAcademicYearId) {
          await tx.studentAcademicYear.updateMany({
            where: { classId, academicYearId: currentAcademicYearId },
            data: {
              classId: targetClassId,
              gradeId: targetGradeId,
            },
          });
        }

        await tx.studentAcademicYear.updateMany({
          where: {
            classId,
            ...(currentAcademicYearId
              ? { academicYearId: { not: currentAcademicYearId } }
              : {}),
          },
          data: {
            classId: null,
          },
        });
      }

      if (lessonIds.length > 0) {
        await deleteLessonGraph(
          tx,
          lessonIds.map((lesson) => lesson.id),
        );
      }

      await tx.exam.updateMany({
        where: { classId },
        data: { classId: null },
      });

      await tx.assignment.updateMany({
        where: { classId },
        data: { classId: null },
      });

      await tx.class.delete({
        where: { id: classId },
      });
    });

    return successResult(["/list/classes", "/list/students"]);
  } catch (err) {
    return errorResult(err);
  }
};
