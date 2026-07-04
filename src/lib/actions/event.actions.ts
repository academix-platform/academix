"use server";

import { notifyNewEvent, notifyParentsNewEvent } from "./notification.actions";
import { EventSchema } from "../formValidationSchemas";
import prisma from "../prisma";
import {
  CurrentState,
  errorResult,
  parseNumericId,
  successResult,
  getRequiredAcademicYearId,
  requireActionAccess,
} from "./helpers";

export const createEvent = async (
  currentState: CurrentState,
  data: EventSchema,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  try {
    const academicYearId = await getRequiredAcademicYearId(access.schoolId);

    await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        schoolId: access.schoolId,
        academicYearId,
        classes: {
          connect: data.classIds.map((classId) => ({ id: classId })),
        },
      },
    });

    // ✅ إشعار الطلاب والمعلمين بالحدث الجديد
    await notifyNewEvent({
      schoolId: access.schoolId,
      eventTitle: data.title,
      targetClassIds: data.classIds.length > 0 ? data.classIds : undefined,
    }).catch(() => {});

    // ✅ إشعار الأولياء بالحدث الجديد
    await notifyParentsNewEvent({
      schoolId: access.schoolId,
      eventTitle: data.title,
      targetClassIds: data.classIds.length > 0 ? data.classIds : undefined,
    }).catch(() => {});

    return successResult(["/list/events"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const updateEvent = async (
  currentState: CurrentState,
  data: EventSchema,
) => {
  if (!data.id) {
    return { success: false, error: true, message: "Event id is required." };
  }

  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  try {
    const existing = await prisma.event.findFirst({
      where: { id: data.id, schoolId: access.schoolId },
      select: { id: true },
    });
    if (!existing) {
      return { success: false, error: true, message: "Event not found." };
    }

    await prisma.event.update({
      where: { id: data.id },
      data: {
        title: data.title,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        classes: {
          set: data.classIds.map((classId) => ({ id: classId })),
        },
      },
    });

    return successResult(["/list/events"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const deleteEvent = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = parseNumericId(data.get("id"));
  if (!id) return { success: false, error: true, message: "Invalid event id." };

  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  try {
    const deleted = await prisma.event.deleteMany({
      where: { id, schoolId: access.schoolId },
    });
    if (deleted.count === 0) {
      return { success: false, error: true, message: "Event not found." };
    }
    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};