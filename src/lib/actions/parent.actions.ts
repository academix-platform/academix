"use server";
import { sendAccountEmail } from "../mail";
import { ParentSchema } from "../formValidationSchemas";
import prisma from "../prisma";
import { clerkClient } from "@clerk/nextjs/server";
import { createParentWith, updateParentWith, type ParentProblem } from "../people/parents";
import {
  CurrentState,
  errorResult,
  isClerkUserNotFoundError,
  requireActionAccess,
  successResult,
} from "./helpers";

const PARENT_MESSAGES: Record<ParentProblem, string> = {
  noStudents: "At least one student is required when creating a parent.",
  studentNotFound: "Student not found.",
  parentNotFound: "Parent not found.",
};

const refused = (problem: ParentProblem) => ({
  success: false,
  error: true,
  message: PARENT_MESSAGES[problem],
});

export const createParent = async (
  currentState: CurrentState,
  data: ParentSchema,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  try {
    const created = await createParentWith(
      { db: prisma, clerk: (await clerkClient()).users },
      access.schoolId,
      { ...data, studentIds: data.students ?? [] },
    );
    if (!created.ok) return refused(created.problem);

    // The parent exists now, so a failed email must not undo it.
    if (data.email && data.password) {
      try {
        await sendAccountEmail(data.email, data.username, data.password);
      } catch (err) {
        console.error("createParent: account email failed", err instanceof Error ? err.name : "unknown error");
      }
    }

    return successResult(["/list/parents"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const updateParent = async (
  currentState: CurrentState,
  data: ParentSchema,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  if (!data.id) {
    return { success: false, error: true, message: "Parent id is required." };
  }

  try {
    const updated = await updateParentWith(
      { db: prisma, clerk: (await clerkClient()).users },
      access.schoolId,
      { ...data, id: data.id, studentIds: data.students },
    );
    if (!updated.ok) return refused(updated.problem);

    return successResult(["/list/parents"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const deleteParent = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  const id = data.get("id") as string;
  if (!id)
    return { success: false, error: true, message: "Invalid parent id." };

  try {
    const existing = await prisma.parent.findFirst({
      where: { id, schoolId: access.schoolId },
      select: { id: true },
    });
    if (!existing) {
      return { success: false, error: true, message: "Parent not found." };
    }

    await prisma.parent.deleteMany({
      where: { id, schoolId: access.schoolId },
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
