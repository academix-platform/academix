import prisma from "./prisma";

const DEFAULT_SCHEDULE = {
  workDayStartHour: 7,
  workDayStartMinute: 0,
  workDayEndHour: 11,
  workDayEndMinute: 30,
  lessonDurationMinutes: 45,
  lessonsPerDay: 6,
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
};

export const getDefaultSchoolScheduleSettings = (): SchoolScheduleSettings => ({
  ...DEFAULT_SCHEDULE,
});

export const getSchoolScheduleSettings =
  async (): Promise<SchoolScheduleSettings> => {
    const schoolSettingsDelegate = (
      prisma as unknown as {
        schoolSettings?: {
          findUnique: (args: {
            where: { id: number };
            select: {
              workDayStart: boolean;
              workDayEnd: boolean;
              lessonDuration: boolean;
              lessonsPerDay: boolean;
            };
          }) => Promise<{
            workDayStart: Date;
            workDayEnd: Date;
            lessonDuration: number;
            lessonsPerDay: number;
          } | null>;
        };
      }
    ).schoolSettings;

    if (!schoolSettingsDelegate?.findUnique) {
      return getDefaultSchoolScheduleSettings();
    }

    let settings: {
      workDayStart: Date;
      workDayEnd: Date;
      lessonDuration: number;
      lessonsPerDay: number;
    } | null = null;

    try {
      settings = await schoolSettingsDelegate.findUnique({
        where: { id: 1 },
        select: {
          workDayStart: true,
          workDayEnd: true,
          lessonDuration: true,
          lessonsPerDay: true,
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
    };
  };
