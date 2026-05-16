import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getRoleHome, type UserRole } from "@/lib/utils";

async function resolveRoleFromDb(userId: string): Promise<UserRole | null> {
  const [admin, teacher, student, parent] = await Promise.all([
    prisma.admin.findUnique({ where: { id: userId }, select: { id: true } }),
    prisma.teacher.findUnique({ where: { id: userId }, select: { id: true } }),
    prisma.student.findUnique({ where: { id: userId }, select: { id: true } }),
    prisma.parent.findUnique({ where: { id: userId }, select: { id: true } }),
  ]);

  if (admin) return "admin";
  if (teacher) return "teacher";
  if (student) return "student";
  if (parent) return "parent";

  return null;
}

export default async function PostLoginPage() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const roleFromClaims = (sessionClaims?.metadata as { role?: UserRole } | undefined)
    ?.role;
  const role = roleFromClaims ?? (await resolveRoleFromDb(userId));

  if (role) {
    redirect(getRoleHome(role));
  }

  redirect("/unauthorized");
}
