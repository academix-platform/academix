"use server";

import { SubjectSchema } from "../formValidationSchemas";
import prisma from "../prisma";
import {
  CurrentState,
  errorResult,
  successResult,
  parseNumericId,
  requireActionAccess,
} from "./helpers";

export const createSubject = async (
  currentState: CurrentState,
  data: SubjectSchema,
) => {
  try {
    const access = await requireActionAccess(["admin"]);
    if ("error" in access) return access;

    const defaultGrade = await prisma.grade.findFirst({
      where: { schoolId: access.schoolId },
      orderBy: { level: "asc" },
      select: { id: true },
    });

    if (!defaultGrade) {
      return {
        success: false,
        error: true,
        message: "Create a grade first before creating subjects.",
      };
    }

    await prisma.subject.create({
      data: {
        name: data.name,
        schoolId: access.schoolId,
        gradeId: (data as any).gradeId ?? defaultGrade.id,
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
    return { success: false, error: true, message: "Subject id is required." };
  }

  try {
    const existing = await prisma.subject.findFirst({
      where: { id: data.id, schoolId: access.schoolId },
      select: { id: true },
    });
    if (!existing) {
      return { success: false, error: true, message: "Subject not found." };
    }

    await prisma.subject.update({
      where: { id: data.id },
      data: {
        name: data.name,
        gradeId: (data as any).gradeId ?? undefined,
        teachers: {
          set: data.teachers.map((teacherId) => ({
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

export const deleteSubject = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  const id = parseNumericId(data.get("id"));
  if (!id)
    return { success: false, error: true, message: "Invalid subject id." };

  try {
    const deleted = await prisma.subject.deleteMany({
      where: { id, schoolId: access.schoolId },
    });
    if (deleted.count === 0) {
      return { success: false, error: true, message: "Subject not found." };
    }

    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};
