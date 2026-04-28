"use server";

import { ParentSchema } from "../formValidationSchemas";
import prisma from "../prisma";
import { clerkClient } from "@clerk/nextjs/server";
import { CurrentState, errorResult, successResult } from "./helpers";

export const createParent = async (
  currentState: CurrentState,
  data: ParentSchema,
) => {
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
  if (!data.id) {
    return { success: false, error: true, message: "Parent id is required." };
  }

  try {
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
  const id = data.get("id") as string;
  if (!id)
    return { success: false, error: true, message: "Invalid parent id." };

  try {
    await (await clerkClient()).users.deleteUser(id);

    await prisma.parent.delete({
      where: { id: id },
    });

    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};
