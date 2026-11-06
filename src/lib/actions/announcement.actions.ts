"use server";

import { notifyNewAnnouncement, notifyParentsNewAnnouncement } from "./notification.actions";
import { AnnouncementSchema } from "../formValidationSchemas";
import prisma from "../prisma";
import {
  CurrentState,
  errorResult,
  parseNumericId,
  successResult,
  getRequiredAcademicYearId,
  requireActionAccess,
} from "./helpers";

export const createAnnouncement = async (
  currentState: CurrentState,
  data: AnnouncementSchema,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  try {
    const academicYearId = await getRequiredAcademicYearId(access.schoolId);

    await prisma.announcement.create({
      data: {
        title: data.title,
        description: data.description,
        date: data.date,
        schoolId: access.schoolId,
        academicYearId,
        classes: {
          connect: data.classIds.map((classId) => ({ id: classId })),
        },
      },
    });

    // ✅ إشعار الطلاب والمعلمين بالإعلان الجديد
    await notifyNewAnnouncement({
      schoolId: access.schoolId,
      announcementTitle: data.title,
      targetClassIds: data.classIds.length > 0 ? data.classIds : undefined,
    }).catch(() => {});

    // ✅ إشعار الأولياء بالإعلان الجديد
    await notifyParentsNewAnnouncement({
      schoolId: access.schoolId,
      announcementTitle: data.title,
      targetClassIds: data.classIds.length > 0 ? data.classIds : undefined,
    }).catch(() => {});

    return successResult(["/list/announcements"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const updateAnnouncement = async (
  currentState: CurrentState,
  data: AnnouncementSchema,
) => {
  if (!data.id) {
    return {
      success: false,
      error: true,
      message: "Announcement id is required.",
    };
  }

  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  try {
    const existing = await prisma.announcement.findFirst({
      where: { id: data.id, schoolId: access.schoolId },
      select: { id: true },
    });
    if (!existing) {
      return { success: false, error: true, message: "Announcement not found." };
    }

    await prisma.announcement.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description,
        date: data.date,
        classes: {
          set: data.classIds.map((classId) => ({ id: classId })),
        },
      },
    });

    return successResult(["/list/announcements"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const deleteAnnouncement = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = parseNumericId(data.get("id"));
  if (!id) {
    return { success: false, error: true, message: "Invalid announcement id." };
  }

  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  try {
    const deleted = await prisma.announcement.deleteMany({
      where: { id, schoolId: access.schoolId },
    });
    if (deleted.count === 0) {
      return { success: false, error: true, message: "Announcement not found." };
    }
    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};