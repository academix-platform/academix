import AttendanceChart from "./AttendanceChart";
import prisma from "@/lib/prisma";
import { getCurrentAcademicYearIdOrNull } from "@/lib/academicYears";
import NoCurrentAcademicYearMessage from "./NoCurrentAcademicYearMessage";
import { requireAuth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, ClipboardCheck } from "lucide-react";

const AttendanceChartContainer = async () => {
  const adminT = await getTranslations("adminDashboard");
  const user = await requireAuth();

  const academicYearId = await getCurrentAcademicYearIdOrNull(user.schoolId);

  if (!academicYearId) {
    return <NoCurrentAcademicYearMessage compact />;
  }

  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysSinceSaturday = (dayOfWeek + 1) % 7;

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - daysSinceSaturday);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const responseData = await prisma.attendance.findMany({
    where: {
      schoolId: user.schoolId,
      academicYearId,
      date: {
        gte: weekStart,
        lt: weekEnd,
      },
    },
    select: {
      date: true,
      present: true,
    },
  });

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const workingDays = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu"];

  const attendanceMap: Record<string, { present: number; absent: number }> = {
    Sun: { present: 0, absent: 0 },
    Mon: { present: 0, absent: 0 },
    Tue: { present: 0, absent: 0 },
    Wed: { present: 0, absent: 0 },
    Thu: { present: 0, absent: 0 },
    Fri: { present: 0, absent: 0 },
    Sat: { present: 0, absent: 0 },
  };

  responseData.forEach((item) => {
    const dayName = daysOfWeek[new Date(item.date).getDay()];

    if (workingDays.includes(dayName)) {
      if (item.present) {
        attendanceMap[dayName].present += 1;
      } else {
        attendanceMap[dayName].absent += 1;
      }
    }
  });

  const data = workingDays.map((day) => ({
    name: day,
    present: attendanceMap[day].present,
    absent: attendanceMap[day].absent,
  }));

  const totalRecords = responseData.length;

  return (
    <div className="flex flex-col justify-between bg-surface border border-outline/80 rounded-2xl p-5 shadow-2xs w-full min-h-[420px]">
      {/* Card Header */}
      <div className="flex items-center justify-between gap-3 mb-4 shrink-0">
        <div>
          <h2 className="font-bold text-base text-content-primary">
            {adminT("attendanceTitle")}
          </h2>
          {totalRecords > 0 && (
            <p className="text-xs text-content-muted mt-0.5">
              {totalRecords} records logged this week
            </p>
          )}
        </div>

        <Link
          href="/list/attendance"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brandPurple-700 hover:text-brandPurple-800 hover:underline transition shrink-0"
        >
          <span>{adminT("viewAttendanceLog")}</span>
          <ArrowUpRight className="w-3.5 h-3.5 rtl:rotate-[-90deg]" />
        </Link>
      </div>

      {/* Main Content: Chart OR Rich Actionable Empty State */}
      <div className="flex-1 w-full flex items-center justify-center">
        {totalRecords === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-8 my-auto w-full max-w-md rounded-2xl border border-dashed border-outline/90 bg-surface-muted/30">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-brandPurple-50 dark:bg-brandPurple-950/40 text-brandPurple-600 dark:text-brandPurple-400 border border-brandPurple-100 dark:border-brandPurple-900/50 mb-3.5 shadow-2xs">
              <ClipboardCheck className="w-7 h-7" />
            </div>

            <h3 className="font-bold text-sm sm:text-base text-content-primary mb-1.5">
              {adminT("emptyAttendanceTitle")}
            </h3>

            <p className="text-xs text-content-muted leading-relaxed max-w-sm mb-5">
              {adminT("emptyAttendanceDesc")}
            </p>

            <Link
              href="/list/attendance"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brandPurple-600 hover:bg-brandPurple-700 text-white font-semibold text-xs shadow-xs hover:shadow-sm transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{adminT("takeAttendanceToday")}</span>
            </Link>
          </div>
        ) : (
          <AttendanceChart data={data} totalRecords={totalRecords} />
        )}
      </div>
    </div>
  );
};

export default AttendanceChartContainer;
