"use server";

import { ClassSchema } from "../formValidationSchemas";
import prisma from "../prisma";
import {
  CurrentState,
  errorResult,
  parseNumericId,
  successResult,
} from "./helpers";

export const createClass = async (
  currentState: CurrentState,
  data: ClassSchema,
) => {
  try {
    await prisma.class.create({
      data,
    });

    return successResult(["/list/classes"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const updateClass = async (
  currentState: CurrentState,
  data: ClassSchema,
) => {
  if (!data.id) {
    return { success: false, error: true, message: "Class id is required." };
  }

  try {
    await prisma.class.update({
      where: { id: data.id },
      data,
    });

    return successResult(["/list/classes"]);
  } catch (err) {
    return errorResult(err);
  }
};

export const deleteClass = async (
  currentState: CurrentState,
  data: FormData,
) => {
  const id = parseNumericId(data.get("id"));
  if (!id) return { success: false, error: true, message: "Invalid class id." };

  try {
    await prisma.class.delete({
      where: { id },
    });

    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};
