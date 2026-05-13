import { MoreHorizontal } from "lucide-react";
import AttendanceChart from "./AttendanceChart";
import prisma from "@/lib/prisma";
import { getCurrentAcademicYearIdOrNull } from "@/lib/academicYears";
import NoCurrentAcademicYearMessage from "./NoCurrentAcademicYearMessage";
import { getAuthUser, requireAuth } from "@/lib/auth";

const AttendanceChartContainer = async () => {
  const user = requireAuth();

  const academicYearId = await getCurrentAcademicYearIdOrNull(
    (await user).schoolId,
  );

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
      schoolId: (await user).schoolId,
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

  return (
    <div className="bg-white p-4 rounded-lg w-full h-full">
      <div className="flex justify-between items-center">
        <h1 className="font-semibold text-lg">Attendance</h1>
        <MoreHorizontal className="w-5 h-5 text-gray-500" />
      </div>
      <AttendanceChart data={data} />
    </div>
  );
};

export default AttendanceChartContainer;
