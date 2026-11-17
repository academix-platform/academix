"use server";

import { notifyNewExam } from "./notification.actions";
import { ExamSchema } from "../formValidationSchemas";
import prisma from "../prisma";
import {
  CurrentState,
  errorResult,
  getRequiredAcademicSemester,
  getRequiredAcademicYearId,
  parseNumericId,
  requireActionAccess,
  successResult,
} from "./helpers";
import { deleteExamFileFromCloudinary } from "../cloudinary";
import { examGroupWhere, teacherExamAccessWhere } from "../exams/group";
import { randomUUID } from "crypto";
import { findGradeSchemeComponent } from "../gradeComponentAccess";

export const createExam = async (
  currentState: CurrentState,
  data: ExamSchema,
) => {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;
  const role = access.role;
  const userId = access.userId;

  try {
    const { academicYearId, semester } = await getRequiredAcademicSemester(
      access.schoolId,
    );

    const lessons = await prisma.lesson.findMany({
      where: {
        academicYearId,
        semester,
        schoolId: access.schoolId,
        subjectId: data.subjectId,
        classId: { in: data.classIds },
        ...(role === "teacher" ? { teacherId: userId! } : {}),
      },
      select: { id: true, classId: true, teacherId: true },
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
    const uniqueClassLessons = Array.from(
      lessons.reduce((map, lesson) => {
        if (!map.has(lesson.classId)) {
          map.set(lesson.classId, lesson);
        }
        return map;
      }, new Map<number, (typeof lessons)[number]>()).values(),
    );
    const gradeComponentId = data.gradeComponentId;
    if (!gradeComponentId) {
      return {
        success: false,
        error: true,
        message: "Choose a grade component for this exam.",
      };
    }
    const componentAssignments = await Promise.all(
      uniqueClassLessons.map(async (lesson) => {
        const component = await findGradeSchemeComponent(prisma, {
          schoolId: access.schoolId,
          teacherId:
            role === "admin" ? data.teacherId ?? lesson.teacherId : userId,
          classId: lesson.classId,
          subjectId: data.subjectId,
          academicYearId,
          semester,
          componentId: gradeComponentId,
        });
        return component
          ? { classId: lesson.classId, componentId: component.id }
          : null;
      }),
    );
    const resolvedComponents = componentAssignments.filter(
      (component): component is NonNullable<typeof component> =>
        component !== null,
    );
    if (resolvedComponents.length !== uniqueClassLessons.length) {
      return {
        success: false,
        error: true,
        message:
          "Set up the grading breakdown for every selected class before creating this exam.",
      };
    }
    const componentIdByClass = new Map(
      resolvedComponents.map((component) => [
        component.classId,
        component.componentId,
      ]),
    );

    const groupId = randomUUID();
    const createdExams = await prisma.$transaction(
      uniqueClassLessons.map((lesson) =>
        prisma.exam.create({
          data: {
            groupId,
            title: data.title,
            startTime: data.startTime,
            endTime: data.endTime,
            lessonId: lesson.id,
            teacherId: role === "admin" ? data.teacherId ?? lesson.teacherId : userId,
            classId: lesson.classId,
            subjectId: data.subjectId,
            academicYearId,
            semester,
            gradeSchemeComponentId: componentIdByClass.get(lesson.classId),
            schoolId: access.schoolId,
          },
        }),
      ),
    );

    // ✅ إشعار الطلاب بالاختبار الجديد
    for (const exam of createdExams) {
      if (exam.classId) {
        await notifyNewExam({
          schoolId: access.schoolId,
          examId: exam.id,
          examTitle: data.title,
          classId: exam.classId,
        }).catch(() => {});
      }
    }

    return successResult(["/list/exams"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const updateExam = async (
  currentState: CurrentState,
  data: ExamSchema,
) => {
  if (!data.id) {
    return { success: false, error: true, message: "Exam id is required." };
  }

  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;
  const role = access.role;
  const userId = access.userId;

  try {
    const academicYearId = await getRequiredAcademicYearId(access.schoolId);

    const existingExam = await prisma.exam.findFirst({
      where: {
        id: data.id,
        schoolId: access.schoolId,
        ...(role === "teacher" ? teacherExamAccessWhere(userId) : {}),
      },
      select: {
        id: true,
        groupId: true,
        semester: true,
        gradeSchemeComponent: { select: { componentId: true } },
      },
    });

    if (!existingExam) {
      return {
        success: false,
        error: true,
        message: "The exam you are trying to update was not found.",
      };
    }

    const lessons = await prisma.lesson.findMany({
      where: {
        academicYearId,
        semester: existingExam.semester,
        schoolId: access.schoolId,
        subjectId: data.subjectId,
        classId: { in: data.classIds },
        ...(role === "teacher" ? { teacherId: userId! } : {}),
      },
      select: { id: true, classId: true, teacherId: true },
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

    const groupExams = await prisma.exam.findMany({
      where: {
        ...examGroupWhere(existingExam.groupId, access),
        academicYearId,
        semester: existingExam.semester,
      },
      select: {
        id: true,
        classId: true,
        teacherId: true,
        gradeSchemeComponentId: true,
      },
    });

    const selectedLessonsByClass = new Map<
      number,
      { id: number; classId: number; teacherId: string }
    >();
    for (const lesson of lessons) {
      selectedLessonsByClass.set(lesson.classId, lesson);
    }
    const gradeComponentId =
      data.gradeComponentId ?? existingExam.gradeSchemeComponent?.componentId;
    let componentIdByClass = new Map<number, number>();
    const semester = existingExam.semester;
    if (semester) {
      if (!gradeComponentId) {
        return {
          success: false,
          error: true,
          message: "Choose a grade component for this exam.",
        };
      }
      const componentAssignments = await Promise.all(
        [...selectedLessonsByClass.values()].map(async (lesson) => {
          const component = await findGradeSchemeComponent(prisma, {
            schoolId: access.schoolId,
            teacherId: role === "admin" ? data.teacherId ?? lesson.teacherId : userId,
            classId: lesson.classId,
            subjectId: data.subjectId,
            academicYearId,
            semester,
            componentId: gradeComponentId,
          });
          return component
            ? { classId: lesson.classId, componentId: component.id }
            : null;
        }),
      );
      const resolvedComponents = componentAssignments.filter(
        (component): component is NonNullable<typeof component> =>
          component !== null,
      );
      if (resolvedComponents.length !== selectedLessonsByClass.size) {
        return {
          success: false,
          error: true,
          message:
            "Set up the grading breakdown for every selected class before updating this exam.",
        };
      }
      componentIdByClass = new Map(
        resolvedComponents.map((component) => [
          component.classId,
          component.componentId,
        ]),
      );
    } else if (data.gradeComponentId) {
      return {
        success: false,
        error: true,
        message:
          "Annual legacy exams cannot be assigned to a semester grade component.",
      };
    }

    await prisma.$transaction(async (tx) => {
      for (const exam of groupExams) {
        if (exam.classId && !selectedLessonsByClass.has(exam.classId)) {
          await tx.exam.delete({ where: { id: exam.id } });
        }
      }

      for (const [classId, lesson] of selectedLessonsByClass) {
        const existingClassExam = groupExams.find(
          (exam) => exam.classId === classId,
        );

        if (existingClassExam) {
          await tx.exam.update({
            where: { id: existingClassExam.id },
            data: {
              title: data.title,
              startTime: data.startTime,
              endTime: data.endTime,
              lessonId: lesson.id,
              classId,
              subjectId: data.subjectId,
              academicYearId,
              semester: existingExam.semester,
              gradeSchemeComponentId:
                componentIdByClass.get(classId) ??
                existingClassExam?.gradeSchemeComponentId ??
                null,
              schoolId: access.schoolId,
            },
          });
        } else {
          await tx.exam.create({
            data: {
              groupId: existingExam.groupId,
              title: data.title,
              startTime: data.startTime,
              endTime: data.endTime,
              lessonId: lesson.id,
              teacherId: role === "admin" ? data.teacherId ?? lesson.teacherId : userId,
              classId,
              subjectId: data.subjectId,
              academicYearId,
              semester: existingExam.semester,
              gradeSchemeComponentId: componentIdByClass.get(classId),
              schoolId: access.schoolId,
            },
          });
        }
      }
    });

    return successResult(["/list/exams"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const deleteExam = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = parseNumericId(data.get("id"));
  if (!id) return { success: false, error: true, message: "Invalid exam id." };

  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;
  const role = access.role;
  const userId = access.userId;
  try {
    if (role === "teacher") {
      const teacherExam = await prisma.exam.findFirst({
        where: { id, schoolId: access.schoolId, lesson: { teacherId: userId } },
        select: { id: true },
      });

      if (!teacherExam) {
        return {
          success: false,
          error: true,
          message: "You are not allowed to delete this exam.",
        };
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Get all submissions for this exam to delete files from Cloudinary
      const submissions = await tx.submission.findMany({
        where: { examId: id, schoolId: access.schoolId },
        include: {
          answers: {
            where: { filePublicId: { not: null } },
            select: { filePublicId: true },
          },
        },
      });

      // Extract filePublicIds
      const filePublicIds = submissions
        .flatMap((s) => s.answers)
        .map((a) => a.filePublicId)
        .filter((pid): pid is string => !!pid);

      // Delete files from Cloudinary (non-blocking)
      for (const publicId of filePublicIds) {
        await deleteExamFileFromCloudinary(publicId).catch((err) => {
          console.error(`[deleteExam] Failed to delete file ${publicId} from Cloudinary:`, err);
        });
      }

      // 2. Delete all results associated with this exam
      await tx.result.deleteMany({
        where: { examId: id, schoolId: access.schoolId },
      });

      // 3. Delete all submissions (cascades to Answers and AiEvaluations)
      await tx.submission.deleteMany({
        where: { examId: id, schoolId: access.schoolId },
      });

      // 4. Delete the exam (cascades to Questions)
      const deleted = await tx.exam.deleteMany({
        where: { id, schoolId: access.schoolId },
      });

      if (deleted.count === 0) {
        throw new Error("Exam not found.");
      }
    });

    return successResult(["/list/exams", "/list/results"]);
  } catch (err) {
    return errorResult(err);
  }
};
