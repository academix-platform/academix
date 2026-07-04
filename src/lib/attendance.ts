import prisma from "@/lib/prisma";
import { getCurrentAcademicYearIdOrNull } from "@/lib/academicYears";

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
      include: {
        class: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    });

    data = students.map((s) => ({
      id: s.id,
      name: s.name,
      className: s.class.name,
      present: studentMap.get(s.id) ?? false,
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
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    data = teachers.map((t) => ({
      id: t.id,
      name: t.name,
      className: "-",
      present: teacherMap.get(t.id) ?? false,
    }));
  }

  return {
    data,
    hasAttendance: attendance.length > 0,
    noCurrentYear: false,
  };
};
