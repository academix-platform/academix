"use server";

import { MessageSchema } from "../formValidationSchemas";
import prisma from "../prisma";
import {
  CurrentState,
  errorResult,
  parseNumericId,
  successResult,
  getRequiredAcademicYearId,
  requireActionAccess,
} from "./helpers";

export const createMessage = async (
  currentState: CurrentState,
  data: MessageSchema,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  try {
    const academicYearId = await getRequiredAcademicYearId(access.schoolId);

    await prisma.message.create({
      data: {
        title: data.title,
        description: data.description,
        schoolId: access.schoolId,
        date: new Date(),
        academicYearId,
        classes: {
          connect: (data.classIds ?? []).map((classId) => ({ id: classId })),
        },
        students: {
          connect: (data.studentIds ?? []).map((studentId) => ({
            id: studentId,
          })),
        },
        parents: {
          connect: (data.parentIds ?? []).map((parentId) => ({
            id: parentId,
          })),
        },
        teachers: {
          connect: (data.teacherIds ?? []).map((teacherId) => ({
            id: teacherId,
          })),
        },
      },
    });

    return successResult(["/list/messages"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const updateMessage = async (
  currentState: CurrentState,
  data: MessageSchema,
) => {
  if (!data.id) {
    return {
      success: false,
      error: true,
      message: "Message id is required.",
    };
  }

  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  try {
    const existingMessage = await prisma.message.findFirst({
      where: { id: data.id, schoolId: access.schoolId },
      select: { date: true },
    });

    if (!existingMessage) {
      return {
        success: false,
        error: true,
        message: "Message not found.",
      };
    }

    await prisma.message.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description,
        date: existingMessage.date,
        classes: {
          set: (data.classIds ?? []).map((classId) => ({ id: classId })),
        },
        students: {
          set: (data.studentIds ?? []).map((studentId) => ({ id: studentId })),
        },
        parents: {
          set: (data.parentIds ?? []).map((parentId) => ({ id: parentId })),
        },
        teachers: {
          set: (data.teacherIds ?? []).map((teacherId) => ({ id: teacherId })),
        },
      },
    });

    return successResult(["/list/messages"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const deleteMessage = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = parseNumericId(data.get("id"));
  if (!id)
    return { success: false, error: true, message: "Invalid message id." };

  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  try {
    const deleted = await prisma.message.deleteMany({
      where: { id, schoolId: access.schoolId },
    });
    if (deleted.count === 0) {
      return { success: false, error: true, message: "Message not found." };
    }
    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};
