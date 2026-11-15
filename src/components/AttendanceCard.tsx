import { getCurrentAcademicYearOrNull } from "@/lib/academicYears";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSchoolDayExceptions, getSchoolScheduleSettings } from "@/lib/schoolSettings";
import { attendancePercentage, todayInTimeZone } from "@/lib/attendanceRules";

type Props = {
  id: string;
  scope: "student" | "teacher";
};

const jsDayToSchoolDay = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
] as const;

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);

const enumerateAcademicDates = (start: Date, end: Date) => {
  const dates: Date[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    dates.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
};

const AttendanceCard = async ({ id, scope }: Props) => {
  const user = await getAuthUser();
  if (!user) {
    return <h1 className="font-semibold text-xl">-</h1>;
  }

  const [currentYear, settings, exceptions] = await Promise.all([
    getCurrentAcademicYearOrNull(user.schoolId),
    getSchoolScheduleSettings(user.schoolId),
    getSchoolDayExceptions(user.schoolId),
  ]);

  if (!currentYear) {
    return <h1 className="font-semibold text-xl">-</h1>;
  }

  // End of today in the school's calendar, not UTC's.
  const today = new Date(`${todayInTimeZone()}T23:59:59.999Z`);
  const yearStart = new Date(`${currentYear.startDate}T00:00:00.000Z`);
  const yearEnd = new Date(`${currentYear.endDate}T23:59:59.999Z`);
  const cappedEnd = today < yearEnd ? today : yearEnd;

  if (cappedEnd < yearStart) {
    return <h1 className="font-semibold text-xl">-</h1>;
  }

  const workingDays = new Set(settings.workingDays);
  const exceptionsByDate = new Map(
    exceptions.map((item) => [item.date, item.type]),
  );

  const expectedDates = enumerateAcademicDates(yearStart, cappedEnd).filter((d) => {
    const iso = toIsoDate(d);
    const dayName = jsDayToSchoolDay[d.getUTCDay()];
    const exception = exceptionsByDate.get(iso);

    if (exception === "WORKING_OVERRIDE") return true;
    if (exception === "HOLIDAY" || exception === "OFF_DAY") return false;

    return workingDays.has(dayName);
  });

  const expectedDateSet = new Set(expectedDates.map(toIsoDate));

  const attendance = await prisma.attendance.findMany({
    where: {
      schoolId: user.schoolId,
      academicYearId: currentYear.id,
      date: {
        gte: new Date(`${currentYear.startDate}T00:00:00.000Z`),
        lte: cappedEnd,
      },
      ...(scope === "student" ? { studentId: id } : { teacherId: id }),
    },
    select: {
      date: true,
      present: true,
    },
  });

  // Only school days with a record count, so days before the student joined
  // or not entered yet don't lower the percentage.
  const percentage = attendancePercentage(
    attendance.map((item) => ({ date: toIsoDate(item.date), present: item.present })),
    expectedDateSet,
  );
  if (percentage === null) {
    return <h1 className="font-semibold text-xl">-</h1>;
  }

  return <h1 className="font-semibold text-xl">{percentage}%</h1>;
};

export default AttendanceCard;
