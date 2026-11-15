"use server";

import { SubjectSchema } from "../formValidationSchemas";
import prisma from "../prisma";
import { allTeachersFound } from "../subjects/access";
import {
  ActionResult,
  CurrentState,
  errorResult,
  successResult,
  parseNumericId,
  requireActionAccess,
} from "./helpers";

const fail = (message: string): ActionResult => ({
  success: false,
  error: true,
  message,
});

/**
 * Checks that the grade and teachers belong to the school and that no other
 * subject of the same grade has this name. Returns an error result, or null.
 */
const validateSubjectInput = async (
  schoolId: number,
  data: SubjectSchema,
  subjectId?: number,
): Promise<ActionResult | null> => {
  const grade = await prisma.grade.findFirst({
    where: { id: data.gradeId, schoolId },
    select: { id: true },
  });
  if (!grade) return fail("Grade not found.");

  if (data.teachers.length > 0) {
    const teachers = await prisma.teacher.findMany({
      where: { id: { in: data.teachers }, schoolId },
      select: { id: true },
    });
    if (!allTeachersFound(data.teachers, teachers.map((t) => t.id))) {
      return fail("One or more teachers were not found.");
    }
  }

  const duplicate = await prisma.subject.findFirst({
    where: {
      schoolId,
      gradeId: data.gradeId,
      name: data.name,
      ...(subjectId ? { id: { not: subjectId } } : {}),
    },
    select: { id: true },
  });
  if (duplicate) {
    return fail("A subject with this name already exists in this grade.");
  }

  return null;
};

export const createSubject = async (
  currentState: CurrentState,
  data: SubjectSchema,
) => {
  try {
    const access = await requireActionAccess(["admin"]);
    if ("error" in access) return access;

    const invalid = await validateSubjectInput(access.schoolId, data);
    if (invalid) return invalid;

    await prisma.subject.create({
      data: {
        name: data.name,
        schoolId: access.schoolId,
        gradeId: data.gradeId,
        teachers: {
          connect: data.teachers.map((teacherId) => ({
            id: teacherId,
          })),
        },
      },
    });

    return successResult(["/list/subjects"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const updateSubject = async (
  currentState: CurrentState,
  data: SubjectSchema,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  if (!data.id) {
    return fail("Subject id is required.");
  }
  const subjectId = data.id;

  try {
    const existing = await prisma.subject.findFirst({
      where: { id: subjectId, schoolId: access.schoolId },
      select: { id: true, gradeId: true },
    });
    if (!existing) {
      return fail("Subject not found.");
    }

    const invalid = await validateSubjectInput(access.schoolId, data, subjectId);
    if (invalid) return invalid;

    // Lessons, assignments and exams point at classes of the current grade.
    // Moving the subject to another grade would leave them in the wrong one.
    if (data.gradeId !== existing.gradeId) {
      const outsideGrade = { gradeId: { not: data.gradeId } };
      const [lessons, assignments, exams] = await Promise.all([
        prisma.lesson.count({
          where: { subjectId, class: outsideGrade },
        }),
        prisma.assignment.count({
          where: {
            subjectId,
            OR: [{ class: outsideGrade }, { lesson: { class: outsideGrade } }],
          },
        }),
        prisma.exam.count({
          where: {
            subjectId,
            OR: [{ class: outsideGrade }, { lesson: { class: outsideGrade } }],
          },
        }),
      ]);

      if (lessons + assignments + exams > 0) {
        return fail(
          `This subject still has ${lessons} lesson(s), ${assignments} assignment(s) and ${exams} exam(s) in classes outside the new grade. Remove or move them before changing the grade.`,
        );
      }
    }

    await prisma.subject.update({
      where: { id: subjectId },
      data: {
        name: data.name,
        gradeId: data.gradeId,
        teachers: {
          set: data.teachers.map((teacherId) => ({
            id: teacherId,
          })),
        },
      },
    });

    return successResult(["/list/subjects", `/list/subjects/${subjectId}`]);
  } catch (err) {
    return errorResult(err);
  }
};

export const deleteSubject = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  const id = parseNumericId(data.get("id"));
  if (!id) return fail("Invalid subject id.");

  try {
    const deleted = await prisma.subject.deleteMany({
      where: { id, schoolId: access.schoolId },
    });
    if (deleted.count === 0) {
      return fail("Subject not found.");
    }

    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};
