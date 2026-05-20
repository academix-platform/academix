"use server";

import { GradeSchema } from "../formValidationSchemas";
import prisma from "../prisma";
import {
  CurrentState,
  deleteLessonGraph,
  errorResult,
  requireActionAccess,
  successResult,
} from "./helpers";

export const createGrade = async (
  currentState: CurrentState,
  data: GradeSchema,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  try {
    await prisma.grade.create({
      data: {
        level: data.level,
        schoolId: access.schoolId,
      },
    });

    return successResult(["/list/grades"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const deleteGrade = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  const rawId = data.get("id");
  const gradeId =
    typeof rawId === "string" ? Number.parseInt(rawId, 10) : Number.NaN;

  if (!gradeId || Number.isNaN(gradeId)) {
    return { success: false, error: true, message: "Invalid grade id." };
  }

  try {
    const [grade, studentsCount, historicalCount, classes] = await prisma.$transaction([
      prisma.grade.findFirst({
        where: { id: gradeId, schoolId: access.schoolId },
        select: { id: true },
      }),
      prisma.student.count({
        where: { gradeId, schoolId: access.schoolId },
      }),
      prisma.studentAcademicYear.count({
        where: { gradeId, schoolId: access.schoolId },
      }),
      prisma.class.findMany({
        where: { gradeId, schoolId: access.schoolId },
        select: { id: true },
      }),
    ]);

    if (!grade) {
      return { success: false, error: true, message: "Grade not found." };
    }

    if (studentsCount > 0) {
      return {
        success: false,
        error: true,
        message:
          "This grade still has students assigned. Move students to another grade before deleting it.",
      };
    }

    if (historicalCount > 0) {
      return {
        success: false,
        error: true,
        message:
          "This grade is still referenced in academic-year history and cannot be deleted.",
      };
    }

    const classIds = classes.map((cls) => cls.id);

    await prisma.$transaction(async (tx) => {
      if (classIds.length > 0) {
        const lessonIds = await tx.lesson.findMany({
          where: { classId: { in: classIds }, schoolId: access.schoolId },
          select: { id: true },
        });

        await deleteLessonGraph(
          tx,
          lessonIds.map((lesson) => lesson.id),
        );

        await tx.exam.updateMany({
          where: { classId: { in: classIds }, schoolId: access.schoolId },
          data: { classId: null },
        });

        await tx.assignment.updateMany({
          where: { classId: { in: classIds }, schoolId: access.schoolId },
          data: { classId: null },
        });

        await tx.class.deleteMany({
          where: { id: { in: classIds }, schoolId: access.schoolId },
        });
      }

      await tx.subject.deleteMany({
        where: { gradeId, schoolId: access.schoolId },
      });

      await tx.grade.delete({
        where: { id: gradeId },
      });
    });

    return successResult(["/list/grades", "/list/classes", "/list/subjects"]);
  } catch (err) {
    return errorResult(err);
  }
};
