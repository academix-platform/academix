import { auth } from "@clerk/nextjs/server";
import prisma from "./prisma";
import { redirect } from "next/navigation";
import { UserRole } from "./utils";
import { SchoolStatus } from "@prisma/client";

export type AuthUser = {
  userId: string;
  role: UserRole;
  schoolId: number;
  schoolStatus: SchoolStatus | null;
  schoolPauseReason: string | null;
};

class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: "UNAUTHENTICATED" | "UNAUTHORIZED" | "NOT_FOUND",
  ) {
    super(message);
    this.name = "AuthError";
  }
}

async function getSchoolId(userId: string, role: UserRole): Promise<number> {
  const select = { schoolId: true } as const;

  try {
    switch (role) {
      case "admin":
        return (
          await prisma.admin.findUniqueOrThrow({
            where: { id: userId },
            select,
          })
        ).schoolId;
      case "teacher":
        return (
          await prisma.teacher.findUniqueOrThrow({
            where: { id: userId },
            select,
          })
        ).schoolId;
      case "student":
        return (
          await prisma.student.findUniqueOrThrow({
            where: { id: userId },
            select,
          })
        ).schoolId;
      case "parent":
        return (
          await prisma.parent.findUniqueOrThrow({
            where: { id: userId },
            select,
          })
        ).schoolId;
      case "superAdmin":
        return 0;
    }
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: string }).code === "P2025"
    ) {
      throw new AuthError(
        `No ${role} record found for userId ${userId}. ` +
          `The user exists in Clerk but not in the application database.`,
        "NOT_FOUND",
      );
    }
    throw err;
  }
}

export const getAuthUser = async (): Promise<AuthUser | null> => {
  const { userId, sessionClaims } = await auth();

  if (!userId) return null;

  const role = (sessionClaims?.metadata as { role?: UserRole } | undefined)
    ?.role;

  if (!role) return null;

  const schoolId = await getSchoolId(userId, role);
  const school =
    schoolId > 0
      ? await prisma.school.findUnique({
          where: { id: schoolId },
          select: { status: true, pauseReason: true },
        })
      : null;

  return {
    userId,
    role,
    schoolId,
    schoolStatus: school?.status ?? null,
    schoolPauseReason: school?.pauseReason ?? null,
  };
};

export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();

  if (!user) {
    redirect("/sign-in");
  }

  return user;
}

export async function requireRole(user: AuthUser, roles: UserRole[]) {
  if (!roles.includes(user.role)) {
    redirect("/unauthorized");
  }
}

export async function enforceAdminSchoolAccess(user: AuthUser) {
  if (!["admin", "teacher", "student", "parent"].includes(user.role)) return;
  if (user.schoolStatus === "ACTIVE") return;

  redirect("/school-access");
}
