import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { getAuthUser, UserRole } from "../auth";
import prisma from "../prisma";
import { getCurrentAcademicYearIdOrNull } from "../academicYears";

export type CurrentState = {
  success: boolean;
  error: boolean;
  message?: string;
};
export type ActionResult = {
  success: boolean;
  error: boolean;
  message?: string;
};

export const successResult = (
  pathsToRevalidate: string[] = [],
): ActionResult => {
  for (const path of pathsToRevalidate) {
    revalidatePath(path);
  }

  return { success: true, error: false };
};

export const errorResult = (
  err: unknown,
  fallbackMessage?: string,
): ActionResult => {
  const message = getReadableActionErrorMessage(err);

  return {
    success: false,
    error: true,
    message: message || fallbackMessage || "Something went wrong!",
  };
};

export const parseNumericId = (
  raw: FormDataEntryValue | null,
): number | null => {
  if (typeof raw !== "string") return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export const ensureAdminAccess = async () => {
  const user = await getAuthUser();
  if (user?.role !== "admin") {
    return {
      success: false,
      error: true,
      message: "You are not allowed to perform this action.",
    } as ActionResult;
  }

  return null;
};

export const requireActionAccess = async (
  roles: UserRole[],
): Promise<
  | { userId: string; role: UserRole; schoolId: number }
  | { success: false; error: true; message: string }
> => {
  const user = await getAuthUser();
  if (!user || !user.role || !roles.includes(user.role)) {
    return {
      success: false,
      error: true,
      message: "You are not allowed to perform this action.",
    };
  }

  return {
    userId: user.userId,
    role: user.role,
    schoolId: user.schoolId,
  };
};

export const getRequiredAcademicYearId = async (schoolId: number) => {
  const currentYearId = await getCurrentAcademicYearIdOrNull(schoolId);
  if (!currentYearId) {
    throw new Error(
      "No current academic year found. Create one and mark it as current in settings.",
    );
  }

  return currentYearId;
};

export const serializeActionError = (err: unknown) => {
  if (!err || typeof err !== "object") {
    return { raw: err };
  }

  const normalizeErrors = (errors: unknown) => {
    if (!Array.isArray(errors)) return errors;

    return errors.map((item) => {
      if (!item || typeof item !== "object") return item;

      const i = item as {
        code?: string;
        message?: string;
        longMessage?: string;
        meta?: unknown;
      };

      return {
        code: i.code,
        message: i.message,
        longMessage: i.longMessage,
        meta: i.meta,
      };
    });
  };

  const e = err as {
    name?: string;
    message?: string;
    stack?: string;
    code?: string;
    meta?: unknown;
    errors?: unknown;
    clerkError?: boolean;
  };

  return {
    name: e.name,
    message: e.message,
    code: e.code,
    meta: e.meta,
    clerkError: e.clerkError,
    errors: normalizeErrors(e.errors),
    stack: e.stack,
  };
};

export const getReadableActionErrorMessage = (err: unknown) => {
  const serialized = serializeActionError(err) as {
    message?: string;
    errors?: Array<{
      code?: string;
      message?: string;
      longMessage?: string;
    }>;
  };

  const clerkError = serialized.errors?.[0];

  if (clerkError?.code === "form_password_pwned") {
    return "Please choose a stronger password, try to  include a mix of uppercase and lowercase letters, numbers, and special characters (!, @, #, $, %, &)";
  }

  const rawClerkMessage = clerkError?.longMessage || clerkError?.message || "";
  if (rawClerkMessage.toLowerCase().includes("online data breach")) {
    return "That password may be unsafe. Please choose a different password that you have not used elsewhere.";
  }

  return rawClerkMessage || serialized.message || "Something went wrong!";
};

export const isClerkUserNotFoundError = (err: unknown) => {
  const serialized = serializeActionError(err) as {
    message?: string;
    status?: number;
    statusCode?: number;
    errors?: Array<{
      code?: string;
      message?: string;
      longMessage?: string;
    }>;
  };

  const messages = [
    serialized.message,
    serialized.errors?.[0]?.message,
    serialized.errors?.[0]?.longMessage,
    err instanceof Error ? err.message : undefined,
    String(err),
  ]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.toLowerCase());

  return (
    serialized.status === 404 ||
    serialized.statusCode === 404 ||
    messages.some(
      (message) =>
        message.includes("no user was found with id") ||
        message.includes("user not found") ||
        message.includes("resource not found"),
    )
  );
};

export const deleteLessonGraph = async (
  tx: Prisma.TransactionClient,
  lessonIds: number[],
) => {
  if (lessonIds.length === 0) return;

  const exams = await tx.exam.findMany({
    where: { lessonId: { in: lessonIds } },
    select: { id: true },
  });
  const assignments = await tx.assignment.findMany({
    where: { lessonId: { in: lessonIds } },
    select: { id: true },
  });

  const examIds = exams.map((exam) => exam.id);
  const assignmentIds = assignments.map((assignment) => assignment.id);

  if (examIds.length > 0) {
    await tx.result.deleteMany({
      where: { examId: { in: examIds } },
    });
  }

  if (assignmentIds.length > 0) {
    await tx.result.deleteMany({
      where: { assignmentId: { in: assignmentIds } },
    });
  }

  if (examIds.length > 0) {
    await tx.exam.deleteMany({
      where: { id: { in: examIds } },
    });
  }

  if (assignmentIds.length > 0) {
    await tx.assignment.deleteMany({
      where: { id: { in: assignmentIds } },
    });
  }

  await tx.lesson.deleteMany({
    where: { id: { in: lessonIds } },
  });
};

export const normalizeAttendanceDate = (date: Date) => {
  const isoDate = date.toISOString().slice(0, 10);
  return new Date(`${isoDate}T00:00:00.000Z`);
};

export const canTeacherManageResultAssessment = async ({
  role,
  userId,
  assessmentType,
  assessmentId,
}: {
  role: UserRole | null;
  userId: string | null;
  assessmentType: "exam" | "assignment";
  assessmentId: number;
}) => {
  if (role === "admin") return true;
  if (role !== "teacher" || !userId) return false;

  const baseWhere = {
    id: assessmentId,
    lesson: { teacherId: userId },
  };

  const checkers = {
    exam: () =>
      prisma.exam.findFirst({
        where: baseWhere,
        select: { id: true },
      }),
    assignment: () =>
      prisma.assignment.findFirst({
        where: baseWhere,
        select: { id: true },
      }),
  };

  const record = await checkers[assessmentType]();

  return record !== null;
};
