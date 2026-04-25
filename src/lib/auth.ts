import { auth } from "@clerk/nextjs/server";

export type UserRole = "admin" | "teacher" | "student" | "parent";

export type AuthUser = {
  userId: string;
  role: UserRole | null;
};

// Get the authenticated user + role

export const getAuthUser = async (): Promise<AuthUser | null> => {
  const { userId, sessionClaims } = await auth();

  if (!userId) return null;

  const role =
    (sessionClaims?.metadata as { role?: UserRole } | undefined)?.role ?? null;

  return { userId, role };
};

// Require authentication

export function requireAuth(user: AuthUser | null): AuthUser {
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

// Require specific roles

export function requireRole(user: AuthUser, roles: UserRole[]) {
  if (!user.role || !roles.includes(user.role)) {
    throw new Error("Forbidden");
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
