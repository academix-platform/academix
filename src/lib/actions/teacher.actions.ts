"use server";
import { sendAccountEmail } from "../mail";
import { TeacherSchema } from "../formValidationSchemas";
import prisma from "../prisma";
import { clerkClient } from "@clerk/nextjs/server";
import { createTeacherWith, updateTeacherWith, type TeacherProblem } from "../people/teachers";
import {
  CurrentState,
  requireActionAccess,
  errorResult,
  isClerkUserNotFoundError,
  successResult,
  deleteLessonGraph,
} from "./helpers";

const TEACHER_MESSAGES: Record<TeacherProblem, string> = {
  noSubjects: "Select at least one subject.",
  subjectNotFound: "Subject not found.",
  noClasses: "No classes found for the selected subject grades.",
  teacherNotFound: "Teacher not found.",
};

const refused = (problem: TeacherProblem) => ({
  success: false,
  error: true,
  message: TEACHER_MESSAGES[problem],
});

/** The subjects picked in the form, as ids. */
const subjectIdsOf = (data: TeacherSchema) => {
  const pairs = data.subjectClassPairs ?? (data.subjects ?? []).map((subjectId) => ({ subjectId }));
  return Array.from(new Set(pairs.map((pair) => Number(pair.subjectId)))).filter((id) => !Number.isNaN(id));
};

export const createTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  try {
    const created = await createTeacherWith(
      { db: prisma, clerk: (await clerkClient()).users },
      access.schoolId,
      { ...data, subjectIds: subjectIdsOf(data) },
    );
    if (!created.ok) return refused(created.problem);

    // The teacher exists now, so a failed email must not undo them.
    if (data.email && data.password) {
      try {
        await sendAccountEmail(data.email, data.username, data.password);
      } catch (err) {
        console.error("createTeacher: account email failed", err instanceof Error ? err.name : "unknown error");
      }
    }

    return successResult(["/list/teachers"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const updateTeacher = async (
  currentState: CurrentState,
  data: TeacherSchema,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  if (!data.id) {
    return { success: false, error: true, message: "Teacher id is required." };
  }

  try {
    const updated = await updateTeacherWith(
      { db: prisma, clerk: (await clerkClient()).users },
      access.schoolId,
      { ...data, id: data.id, subjectIds: subjectIdsOf(data) },
    );
    if (!updated.ok) return refused(updated.problem);

    return successResult(["/list/teachers"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const deleteTeacher = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  const id = data.get("id") as string;
  if (!id)
    return { success: false, error: true, message: "Invalid teacher id." };

  try {
    const existing = await prisma.teacher.findFirst({
      where: { id, schoolId: access.schoolId },
      select: { id: true },
    });
    if (!existing) {
      return { success: false, error: true, message: "Teacher not found." };
    }

    await prisma.$transaction(async (tx) => {
      const lessonIds = (
        await tx.lesson.findMany({
          where: { teacherId: id, schoolId: access.schoolId },
          select: { id: true },
        })
      ).map((lesson) => lesson.id);

      await tx.class.updateMany({
        where: { supervisorId: id, schoolId: access.schoolId },
        data: { supervisorId: null },
      });

      await deleteLessonGraph(tx, lessonIds);

      await tx.teacher.deleteMany({
        where: { id, schoolId: access.schoolId },
      });
    });

    try {
      await (await clerkClient()).users.deleteUser(id);
    } catch (err) {
      if (!isClerkUserNotFoundError(err)) {
        throw err;
      }
    }

    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};
