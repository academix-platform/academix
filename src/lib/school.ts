import prisma from "@/lib/prisma";

export async function getSchoolName(schoolId: number) {
  const school = await prisma.school.findUnique({
    where: { id: schoolId },
    select: { name: true },
  });

  return school?.name ?? "School";
}
