import prisma from "@/lib/prisma";
import { getCurrentAcademicYearIdOrNull } from "@/lib/academicYears";
import { getSchoolScheduleSettings } from "@/lib/schoolSettings";
import { defaultWorkingDays, type SchoolWeekDay } from "@/lib/schoolCalendar";

export type WeeklyDayInfo = {
  date: string; // "YYYY-MM-DD"
  dayName: SchoolWeekDay;
  dayShort: string; // "Sat", "Sun", ...
  dayNumber: number;
  monthShort: string;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
};

export type WeeklyRosterItem = {
  id: string;
  name: string;
  username: string | null;
  img: string | null;
  className: string;
  attendanceByDate: Record<
    string,
    {
      present: boolean;
      isRecorded: boolean;
    }
  >;
  presentCount: number;
  recordedCount: number;
  totalDays: number;
};

export type WeeklyAttendanceDataResult = {
  weekDays: WeeklyDayInfo[];
  weekStartDate: string;
  weekEndDate: string;
  data: WeeklyRosterItem[];
  hasAttendance: boolean;
  noCurrentYear: boolean;
};

export const getAttendanceData = async ({
  role,
  userId,
  scope,
  classId,
  gradeId,
  day,
  schoolId,
}: {
  role: string | null;
  userId: string | null;
  scope: "students" | "teachers";
  classId?: number;
  gradeId?: number;
  day: Date;
  schoolId: number;
}) => {
  // exact date match ONLY
  const academicYearId = await getCurrentAcademicYearIdOrNull(schoolId);

  if (!academicYearId) {
    return {
      data: [],
      hasAttendance: false,
      noCurrentYear: true,
    };
  }

  const attendance = await prisma.attendance.findMany({
    where: {
      schoolId,
      academicYearId,
      date: day,
      ...(scope === "students"
        ? { studentId: { not: null } }
        : { teacherId: { not: null } }),
    },
  });

  // safe maps
  const studentMap = new Map<string, boolean>(
    attendance
      .filter((a): a is typeof a & { studentId: string } => !!a.studentId)
      .map((a) => [a.studentId, a.present]),
  );

  const teacherMap = new Map<string, boolean>(
    attendance
      .filter((a): a is typeof a & { teacherId: string } => !!a.teacherId)
      .map((a) => [a.teacherId, a.present]),
  );

  let data: any[] = [];

  // =========================
  // STUDENTS
  // =========================
  if (scope === "students") {
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        ...(classId ? { classId } : {}),
        ...(!classId && gradeId ? { class: { gradeId } } : {}),
      },
      select: {
        id: true,
        name: true,
        username: true,
        img: true,
        class: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    data = students.map((s) => ({
      id: s.id,
      name: s.name,
      username: s.username,
      img: s.img,
      className: s.class.name,
      present: studentMap.get(s.id) ?? false,
      isRecorded: studentMap.has(s.id),
    }));
  }

  // =========================
  // TEACHERS
  // =========================
  if (scope === "teachers") {
    if (role !== "admin") {
      return { data: [], hasAttendance: false };
    }

    const teachers = await prisma.teacher.findMany({
      where: { schoolId },
      select: { id: true, name: true, username: true, img: true },
      orderBy: { name: "asc" },
    });

    data = teachers.map((t) => ({
      id: t.id,
      name: t.name,
      username: t.username,
      img: t.img,
      className: "-",
      present: teacherMap.get(t.id) ?? false,
      isRecorded: teacherMap.has(t.id),
    }));
  }

  return {
    data,
    hasAttendance: attendance.length > 0,
    noCurrentYear: false,
  };
};

const dayShortMap: Record<SchoolWeekDay, string> = {
  SATURDAY: "Sat",
  SUNDAY: "Sun",
  MONDAY: "Mon",
  TUESDAY: "Tue",
  WEDNESDAY: "Wed",
  THURSDAY: "Thu",
  FRIDAY: "Fri",
};

export const getWeeklyAttendanceData = async ({
  role,
  userId,
  scope,
  classId,
  gradeId,
  anchorDate,
  schoolId,
}: {
  role: string | null;
  userId: string | null;
  scope: "students" | "teachers";
  classId?: number;
  gradeId?: number;
  anchorDate: string; // "YYYY-MM-DD"
  schoolId: number;
}): Promise<WeeklyAttendanceDataResult> => {
  const academicYearId = await getCurrentAcademicYearIdOrNull(schoolId);

  if (!academicYearId) {
    return {
      weekDays: [],
      weekStartDate: "",
      weekEndDate: "",
      data: [],
      hasAttendance: false,
      noCurrentYear: true,
    };
  }

  // Get school's working days
  const scheduleSettings = await getSchoolScheduleSettings(schoolId);
  const workingDays =
    scheduleSettings.workingDays && scheduleSettings.workingDays.length > 0
      ? scheduleSettings.workingDays
      : defaultWorkingDays;

  // Compute Saturday (week start) from anchor date
  const [year, month, dayNum] = anchorDate.split("-").map(Number);
  const anchorUtc = new Date(Date.UTC(year, month - 1, dayNum));
  const dayOfWeek = anchorUtc.getUTCDay(); // 0 is Sun, 6 is Sat
  const daysSinceSaturday = (dayOfWeek + 1) % 7;
  const saturdayUtc = new Date(anchorUtc);
  saturdayUtc.setUTCDate(anchorUtc.getUTCDate() - daysSinceSaturday);

  const schoolWeekDaysMap: SchoolWeekDay[] = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ];

  const todayIso = new Date().toISOString().slice(0, 10);
  const weekDays: WeeklyDayInfo[] = [];

  for (let i = 0; i < 7; i++) {
    const cur = new Date(saturdayUtc);
    cur.setUTCDate(saturdayUtc.getUTCDate() + i);
    const isoDate = cur.toISOString().slice(0, 10);
    const curDayOfWeek = cur.getUTCDay();
    const dayName = schoolWeekDaysMap[curDayOfWeek];

    // Only include school working days
    if (workingDays.includes(dayName)) {
      weekDays.push({
        date: isoDate,
        dayName,
        dayShort: dayShortMap[dayName] || dayName.slice(0, 3),
        dayNumber: cur.getUTCDate(),
        monthShort: cur.toLocaleString("en-US", { month: "short", timeZone: "UTC" }),
        isToday: isoDate === todayIso,
        isPast: isoDate < todayIso,
        isFuture: isoDate > todayIso,
      });
    }
  }

  if (weekDays.length === 0) {
    return {
      weekDays: [],
      weekStartDate: "",
      weekEndDate: "",
      data: [],
      hasAttendance: false,
      noCurrentYear: false,
    };
  }

  const weekStartDate = weekDays[0].date;
  const weekEndDate = weekDays[weekDays.length - 1].date;

  // Query attendance for this week range
  const attendance = await prisma.attendance.findMany({
    where: {
      schoolId,
      academicYearId,
      date: {
        gte: new Date(`${weekStartDate}T00:00:00.000Z`),
        lte: new Date(`${weekEndDate}T23:59:59.999Z`),
      },
      ...(scope === "students"
        ? { studentId: { not: null } }
        : { teacherId: { not: null } }),
    },
    select: {
      studentId: true,
      teacherId: true,
      date: true,
      present: true,
    },
  });

  const attendanceMap = new Map<string, boolean>();
  attendance.forEach((rec) => {
    const targetId = scope === "students" ? rec.studentId : rec.teacherId;
    if (!targetId) return;
    const dateKey = rec.date.toISOString().slice(0, 10);
    attendanceMap.set(`${targetId}:${dateKey}`, rec.present);
  });

  let data: WeeklyRosterItem[] = [];

  // =========================
  // STUDENTS
  // =========================
  if (scope === "students") {
    const students = await prisma.student.findMany({
      where: {
        schoolId,
        ...(classId ? { classId } : {}),
        ...(!classId && gradeId ? { class: { gradeId } } : {}),
      },
      select: {
        id: true,
        name: true,
        username: true,
        img: true,
        class: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    data = students.map((s) => {
      const attendanceByDate: Record<
        string,
        { present: boolean; isRecorded: boolean }
      > = {};
      let presentCount = 0;
      let recordedCount = 0;

      for (const day of weekDays) {
        const key = `${s.id}:${day.date}`;
        const isRecorded = attendanceMap.has(key);
        const present = isRecorded ? attendanceMap.get(key)! : false;
        attendanceByDate[day.date] = { present, isRecorded };
        if (present) presentCount++;
        if (isRecorded) recordedCount++;
      }

      return {
        id: s.id,
        name: s.name,
        username: s.username,
        img: s.img,
        className: s.class.name,
        attendanceByDate,
        presentCount,
        recordedCount,
        totalDays: weekDays.length,
      };
    });
  }

  // =========================
  // TEACHERS
  // =========================
  if (scope === "teachers") {
    if (role !== "admin") {
      return {
        weekDays,
        weekStartDate,
        weekEndDate,
        data: [],
        hasAttendance: false,
        noCurrentYear: false,
      };
    }

    const teachers = await prisma.teacher.findMany({
      where: { schoolId },
      select: { id: true, name: true, username: true, img: true },
      orderBy: { name: "asc" },
    });

    data = teachers.map((t) => {
      const attendanceByDate: Record<
        string,
        { present: boolean; isRecorded: boolean }
      > = {};
      let presentCount = 0;
      let recordedCount = 0;

      for (const day of weekDays) {
        const key = `${t.id}:${day.date}`;
        const isRecorded = attendanceMap.has(key);
        const present = isRecorded ? attendanceMap.get(key)! : false;
        attendanceByDate[day.date] = { present, isRecorded };
        if (present) presentCount++;
        if (isRecorded) recordedCount++;
      }

      return {
        id: t.id,
        name: t.name,
        username: t.username,
        img: t.img,
        className: "-",
        attendanceByDate,
        presentCount,
        recordedCount,
        totalDays: weekDays.length,
      };
    });
  }

  return {
    weekDays,
    weekStartDate,
    weekEndDate,
    data,
    hasAttendance: attendance.length > 0,
    noCurrentYear: false,
  };
};
