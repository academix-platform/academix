"use server";

import { ParentSchema } from "../formValidationSchemas";
import prisma from "../prisma";
import { clerkClient } from "@clerk/nextjs/server";
import {
  CurrentState,
  errorResult,
  requireActionAccess,
  successResult,
} from "./helpers";

export const createParent = async (
  currentState: CurrentState,
  data: ParentSchema,
) => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  let createdUserId: string | null = null;

  if (!data.students || data.students.length === 0) {
    return {
      success: false,
      error: true,
      message: "At least one student is required when creating a parent.",
    };
  }

  try {
    const user = await (
      await clerkClient()
    ).users.createUser({
      username: data.username,
      password: data.password,
      firstName: data.name,
      publicMetadata: { role: "parent" },
    });
    createdUserId = user.id;

    await prisma.parent.create({
      data: {
        id: createdUserId,
        schoolId: access.schoolId,
        username: data.username,
        name: data.name,
        email: data.email || null,
        phone: data.phone,
        address: data.address,
        students: {
          connect: data.students?.map((studentId: string) => ({
            id: studentId,
          })),
        },
      },
    });

    return successResult(["/list/parents"]);
  } catch (err) {
    if (createdUserId) {
      try {
        await (await clerkClient()).users.deleteUser(createdUserId);
      } catch {
        // Best-effort rollback for partial user creation.
      }
    }
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
    const existing = await prisma.parent.findFirst({
      where: { id: data.id, schoolId: access.schoolId },
      select: { id: true },
    });
    if (!existing) {
      return { success: false, error: true, message: "Parent not found." };
    }

    await (
      await clerkClient()
    ).users.updateUser(data.id, {
      username: data.username,
      ...(data.password !== "" && { password: data.password }),
      firstName: data.name,
      publicMetadata: { role: "parent" },
    });

    await prisma.parent.update({
      where: { id: data.id },
      data: {
        ...(data.password !== "" && { password: data.password }),
        username: data.username,
        name: data.name,
        email: data.email || null,
        phone: data.phone,
        address: data.address,
        students: {
          set: data.students?.map((studentId: string) => ({
            id: studentId,
          })),
        },
      },
    });

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
    await (await clerkClient()).users.deleteUser(id);

    const deleted = await prisma.parent.deleteMany({
      where: { id, schoolId: access.schoolId },
    });
    if (deleted.count === 0) {
      return { success: false, error: true, message: "Parent not found." };
    }

    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};
