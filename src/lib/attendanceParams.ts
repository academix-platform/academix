import { getQueryParam } from "@/lib/pageParams";

const normalizeDate = (raw?: string) => {
  if (!raw) return new Date().toISOString().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  return new Date().toISOString().slice(0, 10);
};

export const getAttendanceParams = (resolved: any) => {
  const scope = getQueryParam(resolved.scope) || "students";

  const classIdParam = getQueryParam(resolved.classId);
  const classId = classIdParam ? parseInt(classIdParam) : undefined;

  const currentPage = getQueryParam(resolved.page);
  const page = currentPage ? parseInt(currentPage) : 1;

  const selectedDate = normalizeDate(getQueryParam(resolved.date));

  const dayStart = new Date(`${selectedDate}T00:00:00.000Z`);
  const dayEnd = new Date(`${selectedDate}T23:59:59.999Z`);

  const today = new Date().toISOString().slice(0, 10);
  const isToday = selectedDate === today;

  return {
    scope,
    classId,
    page,
    selectedDate,
    dayStart,
    dayEnd,
    isToday,
  };
};
