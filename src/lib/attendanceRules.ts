// Attendance rules shared by the page, the save action and the attendance
// card. No database calls, so they can be unit-tested.

/**
 * The time zone a school day is counted in. Schools don't store their own
 * yet, so one setting covers the deployment.
 */
export const SCHOOL_TIME_ZONE = process.env.SCHOOL_TIME_ZONE || "Asia/Jerusalem";

/** Student statuses that still attend classes. */
export const ATTENDING_STUDENT_STATUSES = ["ACTIVE", "REPEATED"] as const;

/** Upper bound on rows in one save (one page of a class is far smaller). */
export const MAX_ATTENDANCE_RECORDS = 500;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's calendar date (YYYY-MM-DD) in the given time zone. */
export const todayInTimeZone = (
  now: Date = new Date(),
  timeZone: string = SCHOOL_TIME_ZONE,
) =>
  // en-CA formats as YYYY-MM-DD.
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

export const isIsoDate = (value: unknown): value is string => {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  // Rejects impossible dates such as 2026-13-01 or 2026-02-30.
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
};

/**
 * Attendance can only be taken for today, inside the current academic
 * year — the same rule the page applies. Returns an error message or null.
 */
export const attendanceDateError = (
  date: unknown,
  today: string,
  year: { startDate: string; endDate: string },
): string | null => {
  if (!isIsoDate(date)) return "Invalid date.";
  if (date !== today) return "Attendance can only be saved for today.";
  if (date < year.startDate || date > year.endDate) {
    return "This date is outside the current academic year.";
  }
  return null;
};

/**
 * Parses the submitted rows: an object of person id → present. Returns null
 * for anything else, an empty object, or too many rows.
 */
export const parseAttendanceRecords = (
  raw: unknown,
): Map<string, boolean> | null => {
  if (typeof raw !== "string") return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const entries = Object.entries(parsed);
  if (entries.length === 0 || entries.length > MAX_ATTENDANCE_RECORDS) return null;
  if (!entries.every(([id, present]) => id.length > 0 && typeof present === "boolean")) {
    return null;
  }

  return new Map(entries as [string, boolean][]);
};

/**
 * Attendance percentage over the school days that were actually recorded
 * for this person. Days with no record (attendance not taken yet, or before
 * the student joined) don't count against them. Null when nothing counts.
 */
export const attendancePercentage = (
  records: { date: string; present: boolean }[],
  schoolDays: ReadonlySet<string>,
): number | null => {
  const byDate = new Map<string, boolean>();
  for (const record of records) {
    if (schoolDays.has(record.date)) byDate.set(record.date, record.present);
  }
  if (byDate.size === 0) return null;

  const present = [...byDate.values()].filter(Boolean).length;
  // Rounded down, so 100% means no absences at all.
  return Math.floor((present / byDate.size) * 100);
};
