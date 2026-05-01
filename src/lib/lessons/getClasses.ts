import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function getAccessibleClasses({
  role,
  userId,
  schoolId,
  teacherIdParam,
}: {
  role: string | null;
  userId: string;
  schoolId: number;
  teacherIdParam: string | null;
}) {
  const where: Prisma.ClassWhereInput = { schoolId };

  switch (role) {
    case "admin":
      if (teacherIdParam) {
        where.lessons = {
          some: { teacherId: teacherIdParam },
        };
      }
      break;

    case "teacher":
      where.lessons = {
        some: { teacherId: userId },
      };
      break;

    case "student":
      where.students = {
        some: { id: userId },
      };
      break;

    case "parent":
      where.students = {
        some: { parentId: userId },
      };
      break;

    default:
      where.id = -1;
  }

  return prisma.class.findMany({
    where,
    select: {
      id: true,
      name: true,
      grade: { select: { level: true } },
    },
    orderBy: [{ grade: { level: "asc" } }, { name: "asc" }],
  });
}
