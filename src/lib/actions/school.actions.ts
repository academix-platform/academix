"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { SchoolStatus } from "@prisma/client";

const normalize = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.trim() : "";

export async function createSchoolSignup(formData: FormData) {
  const schoolName = normalize(formData.get("schoolName"));
  const adminName = normalize(formData.get("adminName"));
  const adminUsername = normalize(formData.get("adminUsername"));
  const adminPassword = normalize(formData.get("adminPassword"));

  if (!schoolName || !adminName || !adminUsername || !adminPassword) {
    return {
      success: false,
      message: "All fields are required.",
    };
  }

  let createdClerkUserId: string | null = null;

  try {
    const user = await (await clerkClient()).users.createUser({
      username: adminUsername,
      password: adminPassword,
      firstName: adminName,
      publicMetadata: { role: "admin" },
    });
    createdClerkUserId = user.id;

    await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: schoolName,
          status: "PENDING",
        },
      });

      await tx.admin.create({
        data: {
          id: user.id,
          username: adminUsername,
          schoolId: school.id,
        },
      });
    });

    return {
      success: true,
      message:
        "School request submitted successfully. After approval, your admin can access the dashboard.",
    };
  } catch (error) {
    if (createdClerkUserId) {
      try {
        await (await clerkClient()).users.deleteUser(createdClerkUserId);
      } catch {
        // Best-effort rollback.
      }
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : "Unable to submit school request.",
    };
  }
}

export async function updateSchoolStatus(formData: FormData) {
  const user = await getAuthUser();
  if (!user || user.role !== "superAdmin") {
    return;
  }

  const schoolIdRaw = normalize(formData.get("schoolId"));
  const statusRaw = normalize(formData.get("status"));
  const pauseReason = normalize(formData.get("pauseReason"));
  const schoolId = Number.parseInt(schoolIdRaw, 10);

  if (Number.isNaN(schoolId)) return;
  if (!["PENDING", "ACTIVE", "PAUSED"].includes(statusRaw)) return;

  const status = statusRaw as SchoolStatus;
  await prisma.school.update({
    where: { id: schoolId },
    data: {
      status,
      pauseReason: status === "PAUSED" ? pauseReason || "No reason provided." : null,
    },
  });

  revalidatePath("/super-admin");
}
