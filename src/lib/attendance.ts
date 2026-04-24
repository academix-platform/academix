import prisma from "@/lib/prisma";

export const getAttendanceData = async ({
  role,
  userId,
  scope,
  classId,
  dayStart,
  dayEnd,
}: {
  role: string | null;
  userId: string | null;
  scope: string;
  classId?: number;
  dayStart: Date;
  dayEnd: Date;
}) => {
  const attendance = await prisma.attendance.findMany({
    where: {
      date: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
  });

  const studentMap = new Map(
    attendance.filter((a) => a.studentId).map((a) => [a.studentId, a.present]),
  );

  const teacherMap = new Map(
    attendance.filter((a) => a.teacherId).map((a) => [a.teacherId, a.present]),
  );

  let data: any[] = [];

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
      type: "Student",
      className: s.class.name,
      present: studentMap.get(s.id) ?? false,
    }));
  }

  if (scope === "teachers" && role === "admin") {
    const teachers = await prisma.teacher.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });

    data = teachers.map((t) => ({
      id: t.id,
      name: t.name,
      type: "Teacher",
      className: "-",
      present: teacherMap.get(t.id) ?? false,
    }));
  }

  return {
    data,
    hasAttendance: attendance.length > 0,
  };
};
