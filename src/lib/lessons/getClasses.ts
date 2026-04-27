import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export async function getAccessibleClasses({
  role,
  userId,
  teacherIdParam,
}: {
  role: string | null;
  userId: string;
  teacherIdParam: string | null;
}) {
  const where: Prisma.ClassWhereInput = {};

  if (role !== "admin") {
    where.lessons = {
      some: { teacherId: userId },
    };
  } else if (teacherIdParam) {
    where.lessons = {
      some: { teacherId: teacherIdParam },
    };
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
