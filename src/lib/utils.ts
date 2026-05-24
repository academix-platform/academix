import type { SchoolWeekDay } from "./schoolCalendar";

const getLatestSaturday = (): Date => {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysSinceSaturday = (dayOfWeek + 1) % 7;
  const latestSaturday = today;
  latestSaturday.setDate(today.getDate() - daysSinceSaturday);
  return latestSaturday;
};

const dayOffsets = {
  SATURDAY: 0,
  SUNDAY: 1,
  MONDAY: 2,
  TUESDAY: 3,
  WEDNESDAY: 4,
  THURSDAY: 5,
  FRIDAY: 6,
} as const;

type LessonDay = keyof typeof dayOffsets;

export const adjustScheduleToCurrentWeek = (
  lessons: {
    title: string;
    lessonName?: string;
    day: LessonDay;
    start: Date;
    end: Date;
  }[],
  workingDays?: SchoolWeekDay[],
): { title: string; lessonName?: string; start: Date; end: Date }[] => {
  const latestSaturday = getLatestSaturday();
  const enabledDays = new Set<SchoolWeekDay>(
    workingDays ?? [
      "SATURDAY",
      "SUNDAY",
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
    ],
  );

  return lessons.flatMap((lesson) => {
    if (!enabledDays.has(lesson.day)) {
      return [];
    }

    const daysFromSaturday = dayOffsets[lesson.day];

    const adjustedStartDate = new Date(latestSaturday);

    adjustedStartDate.setDate(latestSaturday.getDate() + daysFromSaturday);
    adjustedStartDate.setHours(
      lesson.start.getHours(),
      lesson.start.getMinutes(),
      lesson.start.getSeconds(),
    );
    const adjustedEndDate = new Date(adjustedStartDate);
    adjustedEndDate.setHours(
      lesson.end.getHours(),
      lesson.end.getMinutes(),
      lesson.end.getSeconds(),
    );

    if (adjustedEndDate <= adjustedStartDate) {
      adjustedEndDate.setMinutes(adjustedStartDate.getMinutes() + 45);
    }

    return [
      {
        title: lesson.title,
        lessonName: lesson.lessonName,
        start: adjustedStartDate,
        end: adjustedEndDate,
      },
    ];
  });
};

export type UserRole = "admin" | "teacher" | "student" | "parent" | "superAdmin";
export function getRoleHome(role: UserRole): string {
  const homes: Record<UserRole, string> = {
    admin: "/admin",
    teacher: "/teacher",
    student: "/student",
    parent: "/parent",
    superAdmin: "/super-admin",
  };
  return homes[role];
}

export function debounce<Args extends unknown[]>(
  fn: (...args: Args) => void,
  delay: number
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let latestArgs: Args | undefined;

  const debounced = (...args: Args) => {
    latestArgs = args;
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn(...args);
      latestArgs = undefined;
    }, delay);
  };

  debounced.flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = undefined;
    }
    if (latestArgs) {
      fn(...latestArgs);
      latestArgs = undefined;
    }
  };

  return debounced;
}
