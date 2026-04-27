"use server";

import { SubjectSchema } from "../formValidationSchemas";
import prisma from "../prisma";
import {
  CurrentState,
  errorResult,
  successResult,
  parseNumericId,
} from "./helpers";

export const createSubject = async (
  currentState: CurrentState,
  data: SubjectSchema,
) => {
  try {
    const defaultGrade = await prisma.grade.findFirst({
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
        gradeId: defaultGrade.id,
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
  if (!data.id) {
    return { success: false, error: true, message: "Subject id is required." };
  }

  try {
    await prisma.subject.update({
      where: { id: data.id },
      data: {
        name: data.name,
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
  const id = parseNumericId(data.get("id"));
  if (!id)
    return { success: false, error: true, message: "Invalid subject id." };

  try {
    await prisma.subject.delete({
      where: { id },
    });

    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};
