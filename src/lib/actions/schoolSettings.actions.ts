"use server";

import { revalidatePath } from "next/cache";

import {
  schoolSettingsSchema,
  type SchoolSettingsSchema,
} from "../formValidationSchemas";
import prisma from "../prisma";
import { errorResult, requireActionAccess, successResult } from "./helpers";
import type { CurrentState } from "./helpers";

const parseTime = (value: string) => {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return { hour, minute };
};

const toUtcTime = (hour: number, minute: number) =>
  new Date(Date.UTC(1970, 0, 1, hour, minute, 0, 0));

export const updateSchoolSettings = async (
  currentState: CurrentState,
  data: SchoolSettingsSchema,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  try {
    const parsed = schoolSettingsSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: true,
        message: parsed.error.issues[0]?.message ?? "Invalid settings payload.",
      };
    }

    const { workDayStart, workDayEnd, lessonDurationMinutes, lessonsPerDay } =
      parsed.data;

    const start = parseTime(workDayStart);
    const end = parseTime(workDayEnd);

    if (!start || !end) {
      return {
        success: false,
        error: true,
        message: "Work day start/end times must be valid HH:MM values.",
      };
    }

    const schoolSettingsDelegate = (
      prisma as unknown as {
        schoolSettings?: {
          upsert: (args: {
            where: { schoolId: number };
            update: {
              workDayStart: Date;
              workDayEnd: Date;
              lessonDuration: number;
              lessonsPerDay: number;
            };
            create: {
              schoolId: number;
              workDayStart: Date;
              workDayEnd: Date;
              lessonDuration: number;
              lessonsPerDay: number;
            };
          }) => Promise<unknown>;
        };
      }
    ).schoolSettings;

    if (!schoolSettingsDelegate?.upsert) {
      return {
        success: false,
        error: true,
        message:
          "School settings model is not available yet. Restart the dev server after running Prisma generate/migrations.",
      };
    }

    await schoolSettingsDelegate.upsert({
      where: { schoolId: access.schoolId },
      update: {
        workDayStart: toUtcTime(start.hour, start.minute),
        workDayEnd: toUtcTime(end.hour, end.minute),
        lessonDuration: lessonDurationMinutes,
        lessonsPerDay,
      },
      create: {
        schoolId: access.schoolId,
        workDayStart: toUtcTime(start.hour, start.minute),
        workDayEnd: toUtcTime(end.hour, end.minute),
        lessonDuration: lessonDurationMinutes,
        lessonsPerDay,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/list/lessons");

    return successResult(["/settings", "/list/lessons"]);
  } catch (err) {
    return errorResult(err);
  }
};
