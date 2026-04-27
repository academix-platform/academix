"use server";

import { AnnouncementSchema } from "../formValidationSchemas";
import prisma from "../prisma";
import {
  CurrentState,
  errorResult,
  parseNumericId,
  successResult,
  ensureAdminAccess,
} from "./helpers";

export const createAnnouncement = async (
  currentState: CurrentState,
  data: AnnouncementSchema,
) => {
  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  try {
    await prisma.announcement.create({
      data: {
        title: data.title,
        description: data.description,
        date: data.date,
        classes: {
          connect: data.classIds.map((classId) => ({ id: classId })),
        },
      },
    });

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

  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  try {
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

  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  try {
    await prisma.announcement.delete({ where: { id } });
    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};
