import type { PrismaClient } from "@prisma/client";

import { SCHOOL_TIME_ZONE, todayInTimeZone } from "@/lib/attendanceRules";

/** Pages each school can have read per day when SHEET_SCAN_DAILY_LIMIT isn't set. */
export const DEFAULT_SHEET_SCAN_DAILY_LIMIT = 200;

/** The daily page limit from SHEET_SCAN_DAILY_LIMIT: a whole number above 0, or 200. */
export const sheetScanDailyLimit = (value: string | undefined = process.env.SHEET_SCAN_DAILY_LIMIT) => {
  const trimmed = value?.trim() ?? "";
  if (!/^\d+$/.test(trimmed)) return DEFAULT_SHEET_SCAN_DAILY_LIMIT;
  const limit = Number(trimmed);
  return limit > 0 ? limit : DEFAULT_SHEET_SCAN_DAILY_LIMIT;
};

/** How far the time zone's clock is ahead of UTC at this instant, in ms. */
const offsetAt = (instant: Date, timeZone: string) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    })
      .formatToParts(instant)
      .map((part) => [part.type, Number(part.value)]),
  );
  const wallClock = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return wallClock - Math.floor(instant.getTime() / 1000) * 1000;
};

/** The instant the school's current day began, at midnight in its time zone. */
export const startOfSchoolDay = (now: Date = new Date(), timeZone: string = SCHOOL_TIME_ZONE) => {
  const midnightAsUtc = new Date(`${todayInTimeZone(now, timeZone)}T00:00:00Z`).getTime();
  // Take the offset at midnight itself, which can differ from now's on a clock-change day.
  const guess = new Date(midnightAsUtc - offsetAt(now, timeZone));
  return new Date(midnightAsUtc - offsetAt(guess, timeZone));
};

export type ReadLogDb = Pick<PrismaClient, "entrySheetRead">;

/**
 * Logs a page read before Gemini is called, so every paid call counts towards
 * the limit even if it fails. Refuses, logging nothing, once the school has
 * reached its limit for the day. The log holds only the school, sheet, model,
 * status and time: never the photo, marks or names.
 */
export const reserveSheetRead = async (
  db: ReadLogDb,
  {
    schoolId,
    sheetId,
    model,
    limit,
    now = new Date(),
  }: { schoolId: number; sheetId: string; model: string; limit: number; now?: Date },
): Promise<{ allowed: false } | { allowed: true; readId: number }> => {
  const usedToday = await db.entrySheetRead.count({
    where: { schoolId, createdAt: { gte: startOfSchoolDay(now) } },
  });
  // Two reads at the same moment can both pass, so a school may go one or two over.
  if (usedToday >= limit) return { allowed: false };

  const { id } = await db.entrySheetRead.create({
    data: { schoolId, sheetId, model, succeeded: false },
    select: { id: true },
  });
  return { allowed: true, readId: id };
};

/** Marks a logged read as succeeded, against the sheet the photo matched. */
export const markSheetReadSucceeded = async (db: ReadLogDb, readId: number, sheetId: string) => {
  await db.entrySheetRead.update({ where: { id: readId }, data: { sheetId, succeeded: true } });
};
