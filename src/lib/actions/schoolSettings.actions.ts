"use server";

import { revalidatePath } from "next/cache";

import {
  schoolDayExceptionSchema,
  schoolSettingsSchema,
  schoolWorkingDaysSchema,
  type SchoolDayExceptionSchema,
  type SchoolSettingsSchema,
  type SchoolWorkingDaysSchema,
} from "../formValidationSchemas";
import prisma from "../prisma";
import {
  errorResult,
  parseNumericId,
  requireActionAccess,
  successResult,
} from "./helpers";
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

export const updateSchoolWorkingDays = async (
  currentState: CurrentState,
  data: SchoolWorkingDaysSchema,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  try {
    const parsed = schoolWorkingDaysSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: true,
        message: parsed.error.issues[0]?.message ?? "Invalid working days payload.",
      };
    }

    const schoolSettingsDelegate = (
      prisma as unknown as {
        schoolSettings?: {
          upsert: (args: {
            where: { schoolId: number };
            update: { workingDays: string[] };
            create: {
              schoolId: number;
              workDayStart: Date;
              workDayEnd: Date;
              lessonDuration: number;
              lessonsPerDay: number;
              workingDays: string[];
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
        workingDays: parsed.data.workingDays,
      },
      create: {
        schoolId: access.schoolId,
        workDayStart: toUtcTime(7, 0),
        workDayEnd: toUtcTime(11, 30),
        lessonDuration: 45,
        lessonsPerDay: 6,
        workingDays: parsed.data.workingDays,
      },
    });

    return successResult(["/settings", "/list/lessons"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const createSchoolDayException = async (
  currentState: CurrentState,
  data: SchoolDayExceptionSchema,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  try {
    const parsed = schoolDayExceptionSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: true,
        message: parsed.error.issues[0]?.message ?? "Invalid exception payload.",
      };
    }

    const date = new Date(`${parsed.data.date}T00:00:00.000Z`);

    const dayExceptionDelegate = (
      prisma as unknown as {
        schoolDayException?: {
          upsert: (args: {
            where: {
              schoolId_date: {
                schoolId: number;
                date: Date;
              };
            };
            update: {
              type: "HOLIDAY" | "OFF_DAY" | "WORKING_OVERRIDE";
              name: string | null;
              notes: string | null;
            };
            create: {
              schoolId: number;
              date: Date;
              type: "HOLIDAY" | "OFF_DAY" | "WORKING_OVERRIDE";
              name: string | null;
              notes: string | null;
            };
          }) => Promise<unknown>;
        };
      }
    ).schoolDayException;

    if (!dayExceptionDelegate?.upsert) {
      return {
        success: false,
        error: true,
        message:
          "School day exceptions model is not available yet. Restart the dev server after running Prisma generate/migrations.",
      };
    }

    await dayExceptionDelegate.upsert({
      where: {
        schoolId_date: {
          schoolId: access.schoolId,
          date,
        },
      },
      update: {
        type: parsed.data.type,
        name: parsed.data.name || null,
        notes: parsed.data.notes || null,
      },
      create: {
        schoolId: access.schoolId,
        date,
        type: parsed.data.type,
        name: parsed.data.name || null,
        notes: parsed.data.notes || null,
      },
    });

    return successResult(["/settings", "/list/lessons", "/list/events"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const deleteSchoolDayException = async (
  currentState: CurrentState,
  formData: FormData,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  const id = parseNumericId(formData.get("id"));
  if (!id) {
    return {
      success: false,
      error: true,
      message: "Invalid exception id.",
    };
  }

  try {
    const dayExceptionDelegate = (
      prisma as unknown as {
        schoolDayException?: {
          deleteMany: (args: {
            where: {
              id: number;
              schoolId: number;
            };
          }) => Promise<unknown>;
        };
      }
    ).schoolDayException;

    if (!dayExceptionDelegate?.deleteMany) {
      return {
        success: false,
        error: true,
        message:
          "School day exceptions model is not available yet. Restart the dev server after running Prisma generate/migrations.",
      };
    }

    await dayExceptionDelegate.deleteMany({
      where: {
        id,
        schoolId: access.schoolId,
      },
    });

    return successResult(["/settings", "/list/lessons", "/list/events"]);
  } catch (err) {
    return errorResult(err);
  }
};
