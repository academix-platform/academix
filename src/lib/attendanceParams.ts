// lib/attendanceParams.ts
import { getQueryParam } from "@/lib/pageParams";
import { isIsoDate, todayInTimeZone } from "@/lib/attendanceRules";

// "Today" is the school's calendar day, not UTC's.
const normalizeDate = (raw: string | undefined, today: string) =>
  isIsoDate(raw) ? raw : today;

export const getAttendanceParams = (resolved: any) => {
  const rawScope = getQueryParam(resolved.scope);
  const scope: "students" | "teachers" =
    rawScope === "teachers" ? "teachers" : "students";

  const classIdParam = getQueryParam(resolved.classId);
  const classId = classIdParam ? parseInt(classIdParam) : undefined;

  const currentPage = getQueryParam(resolved.page);
  const page = currentPage ? parseInt(currentPage) : 1;

  const today = todayInTimeZone();
  const selectedDate = normalizeDate(getQueryParam(resolved.date), today);

  const day = new Date(`${selectedDate}T00:00:00.000Z`);

  const isToday = selectedDate === today;

  return {
    scope,
    classId,
    page,
    selectedDate,
    day,
    isToday,
  };
};
