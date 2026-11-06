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
  displayName: string | null;
  profileImageUrl: string | null;
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

async function getUserProfile(
  userId: string,
  role: UserRole,
): Promise<{ schoolId: number; displayName: string | null; profileImageUrl: string | null }> {
  try {
    switch (role) {
      case "admin": {
        const admin = await prisma.admin.findUniqueOrThrow({
          where: { id: userId },
          select: { schoolId: true, username: true },
        });

        return {
          schoolId: admin.schoolId,
          displayName: admin.username,
          profileImageUrl: null,
        };
      }
      case "teacher": {
        const teacher = await prisma.teacher.findUniqueOrThrow({
          where: { id: userId },
          select: { schoolId: true, name: true, img: true },
        });

        return {
          schoolId: teacher.schoolId,
          displayName: teacher.name,
          profileImageUrl: teacher.img,
        };
      }
      case "student": {
        const student = await prisma.student.findUniqueOrThrow({
          where: { id: userId },
          select: { schoolId: true, name: true, img: true },
        });

        return {
          schoolId: student.schoolId,
          displayName: student.name,
          profileImageUrl: student.img,
        };
      }
      case "parent": {
        const parent = await prisma.parent.findUniqueOrThrow({
          where: { id: userId },
          select: { schoolId: true, name: true },
        });

        return {
          schoolId: parent.schoolId,
          displayName: parent.name,
          profileImageUrl: null,
        };
      }
      case "superAdmin":
        return { schoolId: 0, displayName: null, profileImageUrl: null };
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

  const profile = await getUserProfile(userId, role);
  const schoolId = profile.schoolId;
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
    displayName: profile.displayName,
    profileImageUrl: profile.profileImageUrl,
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
