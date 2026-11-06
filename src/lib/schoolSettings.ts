import prisma from "./prisma";
import {
  defaultWorkingDays,
  schoolWeekDays,
  type SchoolWeekDay,
} from "./schoolCalendar";

const DEFAULT_SCHEDULE = {
  workDayStartHour: 7,
  workDayStartMinute: 0,
  workDayEndHour: 11,
  workDayEndMinute: 30,
  lessonDurationMinutes: 45,
  lessonsPerDay: 6,
  workingDays: defaultWorkingDays,
} as const;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const toHourMinute = (value: Date) => ({
  hour: value.getUTCHours(),
  minute: value.getUTCMinutes(),
});

export type SchoolScheduleSettings = {
  workDayStartHour: number;
  workDayStartMinute: number;
  workDayEndHour: number;
  workDayEndMinute: number;
  lessonDurationMinutes: number;
  lessonsPerDay: number;
  workingDays: SchoolWeekDay[];
};

export type SchoolDayExceptionItem = {
  id: number;
  date: string;
  type: "HOLIDAY" | "OFF_DAY" | "WORKING_OVERRIDE";
  name: string | null;
  notes: string | null;
};

const normalizeWorkingDays = (value: unknown): SchoolWeekDay[] => {
  if (!Array.isArray(value)) return defaultWorkingDays;

  const parsed = value.filter((item): item is SchoolWeekDay =>
    schoolWeekDays.includes(item as SchoolWeekDay),
  );

  if (parsed.length === 0) return defaultWorkingDays;

  return schoolWeekDays.filter((day) => parsed.includes(day));
};

export const getDefaultSchoolScheduleSettings = (): SchoolScheduleSettings => ({
  ...DEFAULT_SCHEDULE,
});

export const getSchoolScheduleSettings = async (
  schoolId: number,
): Promise<SchoolScheduleSettings> => {
  let settings: {
    workDayStart: Date;
    workDayEnd: Date;
    lessonDuration: number;
    lessonsPerDay: number;
    workingDays: unknown;
  } | null = null;

  try {
    settings = await prisma.schoolSettings.findUnique({
      where: { schoolId },
      select: {
        workDayStart: true,
        workDayEnd: true,
        lessonDuration: true,
        lessonsPerDay: true,
        workingDays: true,
      },
    });
  } catch {
    return getDefaultSchoolScheduleSettings();
  }

  if (!settings) {
    return getDefaultSchoolScheduleSettings();
  }

  const start = toHourMinute(settings.workDayStart);
  const end = toHourMinute(settings.workDayEnd);

  return {
    workDayStartHour: clamp(start.hour, 0, 23),
    workDayStartMinute: clamp(start.minute, 0, 59),
    workDayEndHour: clamp(end.hour, 0, 23),
    workDayEndMinute: clamp(end.minute, 0, 59),
    lessonDurationMinutes: clamp(settings.lessonDuration, 15, 180),
    lessonsPerDay: clamp(settings.lessonsPerDay, 1, 12),
    workingDays: normalizeWorkingDays(settings.workingDays),
  };
};

export const getSchoolDayExceptions = async (
  schoolId: number,
): Promise<SchoolDayExceptionItem[]> => {
  try {
    const dayExceptionDelegate = (
      prisma as unknown as {
        schoolDayException?: {
          findMany: (args: {
            where: { schoolId: number };
            orderBy: { date: "asc" };
            select: {
              id: true;
              date: true;
              type: true;
              name: true;
              notes: true;
            };
          }) => Promise<
            {
              id: number;
              date: Date;
              type: "HOLIDAY" | "OFF_DAY" | "WORKING_OVERRIDE";
              name: string | null;
              notes: string | null;
            }[]
          >;
        };
      }
    ).schoolDayException;

    if (!dayExceptionDelegate?.findMany) return [];

    const items = await dayExceptionDelegate.findMany({
      where: { schoolId },
      orderBy: { date: "asc" },
      select: {
        id: true,
        date: true,
        type: true,
        name: true,
        notes: true,
      },
    });

    return items.map((item) => ({
      id: item.id,
      date: item.date.toISOString().slice(0, 10),
      type: item.type,
      name: item.name,
      notes: item.notes,
    }));
  } catch {
    return [];
  }
};
