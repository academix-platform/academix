import { auth } from "@clerk/nextjs/server";

export type UserRole = "admin" | "teacher" | "student" | "parent";

export const getCurrentRole = async (): Promise<UserRole | null> => {
  const { sessionClaims } = await auth();

  const role = (sessionClaims?.metadata as { role?: UserRole } | undefined)
    ?.role;

  return role ?? null;
};

export const getUserId = async (): Promise<string | null> => {
  const { userId } = await auth();

  return userId ?? null;
};
