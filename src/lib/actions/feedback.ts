"use server";

import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function createFeedback(formData: FormData) {
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const type = formData.get("type") as string;
  const message = formData.get("message") as string;

  if (!type || !message) {
    throw new Error("Missing fields");
  }

  const { schoolId, userId } = user;

  await prisma.feedback.create({
    data: {
      type,
      message,
      schoolId,
      userId,
    },
  });
}

export async function updateFeedbackStatus(formData: FormData) {
  const user = await getAuthUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const id = formData.get("id") as string;
  const status = formData.get("status") as string;

  if (!id || !status) {
    throw new Error("Missing fields");
  }

  const allowedStatuses = ["pending", "reviewed", "resolved"];

  if (!allowedStatuses.includes(status)) {
    throw new Error("Invalid status");
  }

  await prisma.feedback.updateMany({
    where: {
      id,
      schoolId: user.schoolId,
    },
    data: {
      status,
    },
  });

  revalidatePath("/admin/feedbacks");
}