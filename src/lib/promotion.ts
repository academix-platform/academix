const pad = (value: number) => String(value).padStart(2, "0");

const toLocalIsoDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/**
 * Promotion may only run once the academic year is over, i.e. from the day
 * after its end date. `endDate` is a `@db.Date` column (UTC midnight) or its
 * ISO date string.
 */
export const isAcademicYearFinished = (
  endDate: Date | string,
  today: Date = new Date(),
) => {
  const endIsoDate =
    typeof endDate === "string" ? endDate.slice(0, 10) : endDate.toISOString().slice(0, 10);
  return toLocalIsoDate(today) > endIsoDate;
};
