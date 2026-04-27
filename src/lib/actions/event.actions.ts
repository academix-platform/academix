"use server";

import { EventSchema } from "../formValidationSchemas";
import prisma from "../prisma";
import { getCurrentAcademicYearId } from "../academicYears";
import {
  CurrentState,
  errorResult,
  parseNumericId,
  successResult,
  ensureAdminAccess,
} from "./helpers";

export const createEvent = async (
  currentState: CurrentState,
  data: EventSchema,
) => {
  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  try {
    const academicYearId = await getCurrentAcademicYearId();

    await prisma.event.create({
      data: {
        title: data.title,
        description: data.description,
        startDate: data.startDate,
        endDate: data.endDate,
        academicYearId,
        classes: {
          connect: data.classIds.map((classId) => ({ id: classId })),
        },
      },
    });

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

  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  try {
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

  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  try {
    await prisma.event.delete({ where: { id } });
    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};
