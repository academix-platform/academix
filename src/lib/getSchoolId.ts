import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export async function getSchoolId() {
  const { userId } = auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  const user = await prisma.teacher.findUnique({
    where: { id: userId },
    select: { schoolId: true },
  });

  const schoolId = user?.schoolId;

  if (!schoolId) {
    throw new Error("School ID not found");
  }

  return schoolId;
}
