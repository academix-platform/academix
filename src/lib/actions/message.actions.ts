"use server";

import { notifyNewMessage, notifyParentsNewMessage } from "./notification.actions";
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

    const classIds = Array.from(new Set(data.classIds ?? []));
    const studentIds = Array.from(new Set(data.studentIds ?? []));
    const parentIds = Array.from(new Set(data.parentIds ?? []));
    const teacherIds = Array.from(new Set(data.teacherIds ?? []));

    const [classCount, studentCount, parentCount, teacherCount] = await Promise.all([
      classIds.length > 0
        ? prisma.class.count({ where: { id: { in: classIds }, schoolId: access.schoolId } })
        : 0,
      studentIds.length > 0
        ? prisma.student.count({ where: { id: { in: studentIds }, schoolId: access.schoolId } })
        : 0,
      parentIds.length > 0
        ? prisma.parent.count({ where: { id: { in: parentIds }, schoolId: access.schoolId } })
        : 0,
      teacherIds.length > 0
        ? prisma.teacher.count({ where: { id: { in: teacherIds }, schoolId: access.schoolId } })
        : 0,
    ]);

    if (
      classCount !== classIds.length ||
      studentCount !== studentIds.length ||
      parentCount !== parentIds.length ||
      teacherCount !== teacherIds.length
    ) {
      return {
        success: false,
        error: true,
        message: "One or more selected recipients or classes do not belong to your school.",
      };
    }

    await prisma.message.create({
      data: {
        title: data.title,
        description: data.description,
        schoolId: access.schoolId,
        date: new Date(),
        academicYearId,
        classes: {
          connect: classIds.map((classId) => ({ id: classId })),
        },
        students: {
          connect: studentIds.map((studentId) => ({
            id: studentId,
          })),
        },
        parents: {
          connect: parentIds.map((parentId) => ({
            id: parentId,
          })),
        },
        teachers: {
          connect: teacherIds.map((teacherId) => ({
            id: teacherId,
          })),
        },
      },
    });

    // ✅ إشعار المستقبلين بالرسالة الجديدة
    const allStudentIds = studentIds;
    const allTeacherIds = teacherIds;

    // إشعار الطلاب
    if (allStudentIds.length > 0) {
      await notifyNewMessage({
        schoolId: access.schoolId,
        recipientIds: allStudentIds,
        recipientRole: "student",
        senderName: "Admin",
        messageTitle: data.title,
      }).catch(() => {});
    }

    // إشعار المعلمين
    if (allTeacherIds.length > 0) {
      await notifyNewMessage({
        schoolId: access.schoolId,
        recipientIds: allTeacherIds,
        recipientRole: "teacher",
        senderName: "Admin",
        messageTitle: data.title,
      }).catch(() => {});
    }

    // ✅ إشعار الأولياء بالرسالة الجديدة
    if (parentIds.length > 0) {
      await notifyParentsNewMessage({
        schoolId: access.schoolId,
        parentIds,
        senderName: "Admin",
        messageTitle: data.title,
      }).catch(() => {});
    }

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

    const classIds = Array.from(new Set(data.classIds ?? []));
    const studentIds = Array.from(new Set(data.studentIds ?? []));
    const parentIds = Array.from(new Set(data.parentIds ?? []));
    const teacherIds = Array.from(new Set(data.teacherIds ?? []));

    const [classCount, studentCount, parentCount, teacherCount] = await Promise.all([
      classIds.length > 0
        ? prisma.class.count({ where: { id: { in: classIds }, schoolId: access.schoolId } })
        : 0,
      studentIds.length > 0
        ? prisma.student.count({ where: { id: { in: studentIds }, schoolId: access.schoolId } })
        : 0,
      parentIds.length > 0
        ? prisma.parent.count({ where: { id: { in: parentIds }, schoolId: access.schoolId } })
        : 0,
      teacherIds.length > 0
        ? prisma.teacher.count({ where: { id: { in: teacherIds }, schoolId: access.schoolId } })
        : 0,
    ]);

    if (
      classCount !== classIds.length ||
      studentCount !== studentIds.length ||
      parentCount !== parentIds.length ||
      teacherCount !== teacherIds.length
    ) {
      return {
        success: false,
        error: true,
        message: "One or more selected recipients or classes do not belong to your school.",
      };
    }

    await prisma.message.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description,
        date: existingMessage.date,
        classes: {
          set: classIds.map((classId) => ({ id: classId })),
        },
        students: {
          set: studentIds.map((studentId) => ({ id: studentId })),
        },
        parents: {
          set: parentIds.map((parentId) => ({ id: parentId })),
        },
        teachers: {
          set: teacherIds.map((teacherId) => ({ id: teacherId })),
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