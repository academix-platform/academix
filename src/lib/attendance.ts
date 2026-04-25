import prisma from "@/lib/prisma";

export const getAttendanceData = async ({
  role,
  userId,
  scope,
  classId,
  day,
}: {
  role: string | null;
  userId: string | null;
  scope: "students" | "teachers";
  classId?: number;
  day: Date;
}) => {
  // exact date match ONLY
  const attendance = await prisma.attendance.findMany({
    where: {
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
      where: classId ? { classId } : {},
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
  };
};
