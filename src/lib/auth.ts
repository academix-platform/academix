import { auth } from "@clerk/nextjs/server";
import prisma from "./prisma";
import { redirect } from "next/navigation";

export type UserRole = "admin" | "teacher" | "student" | "parent";

export type AuthUser = {
  userId: string;
  role: UserRole | null;
  schoolId: number;
};

async function getSchoolId(userId: string, role: UserRole): Promise<number> {
  switch (role) {
    case "admin":
      return (
        await prisma.admin.findUniqueOrThrow({
          where: { id: userId },
          select: { schoolId: true },
        })
      ).schoolId;

    case "teacher":
      return (
        await prisma.teacher.findUniqueOrThrow({
          where: { id: userId },
          select: { schoolId: true },
        })
      ).schoolId;

    case "student":
      return (
        await prisma.student.findUniqueOrThrow({
          where: { id: userId },
          select: { schoolId: true },
        })
      ).schoolId;

    case "parent":
      return (
        await prisma.parent.findUniqueOrThrow({
          where: { id: userId },
          select: { schoolId: true },
        })
      ).schoolId;
  }
}

// Get the authenticated user + role

export const getAuthUser = async (): Promise<AuthUser | null> => {
  const { userId, sessionClaims } = await auth();

  if (!userId) return null;

  const role = (sessionClaims?.metadata as { role?: UserRole } | undefined)
    ?.role;

  if (!role) return null;

  const schoolId = await getSchoolId(userId, role);

  return {
    userId,
    role,
    schoolId,
  };
};

// Require authentication

export function requireAuth(user: AuthUser | null): AuthUser {
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

// Require specific roles

export function requireRoleRedirect(user: AuthUser, roles: UserRole[]) {
  if (!user.role || !roles.includes(user.role)) {
    redirect("/unauthorized");
  }
}

// safe role redirect
export function getRoleHome(role: UserRole | null): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "teacher":
      return "/teacher";
    case "student":
      return "/student";
    case "parent":
      return "/parent";
    default:
      return "/";
  }
}
