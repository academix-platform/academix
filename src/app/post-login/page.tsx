import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getRoleHome, type UserRole } from "@/lib/utils";
import { SchoolStatus } from "@prisma/client";

async function resolveRoleAndSchoolStatusFromDb(userId: string): Promise<{
  role: UserRole | null;
  schoolStatus: SchoolStatus | null;
}> {
  const [admin, teacher, student, parent] = await Promise.all([
    prisma.admin.findUnique({
      where: { id: userId },
      select: { id: true, school: { select: { status: true } } },
    }),
    prisma.teacher.findUnique({
      where: { id: userId },
      select: { id: true, school: { select: { status: true } } },
    }),
    prisma.student.findUnique({
      where: { id: userId },
      select: { id: true, school: { select: { status: true } } },
    }),
    prisma.parent.findUnique({
      where: { id: userId },
      select: { id: true, school: { select: { status: true } } },
    }),
  ]);

  if (admin) return { role: "admin", schoolStatus: admin.school.status };
  if (teacher) return { role: "teacher", schoolStatus: teacher.school.status };
  if (student) return { role: "student", schoolStatus: student.school.status };
  if (parent) return { role: "parent", schoolStatus: parent.school.status };

  return { role: null, schoolStatus: null };
}

export default async function PostLoginPage() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const roleFromClaims = (sessionClaims?.metadata as { role?: UserRole } | undefined)
    ?.role;
  const resolved = await resolveRoleAndSchoolStatusFromDb(userId);
  const role = roleFromClaims ?? resolved.role;

  if (role === "admin" || role === "teacher" || role === "student" || role === "parent") {
    const status = resolved.schoolStatus;
    if (status === "PENDING" || status === "PAUSED") {
      redirect("/school-access");
    }

    if (status !== "ACTIVE") {
      redirect("/unauthorized");
    }
  }

  if (role) {
    redirect(getRoleHome(role));
  }

  redirect("/unauthorized");
}
