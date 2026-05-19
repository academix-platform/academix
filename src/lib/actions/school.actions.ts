"use server";

import { clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { SchoolStatus } from "@prisma/client";
import { getReadableActionErrorMessage } from "./helpers";

const normalize = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.trim() : "";

export async function createSchoolSignup(formData: FormData) {
  const schoolName = normalize(formData.get("schoolName"));
  const contactEmail = normalize(formData.get("contactEmail"));
  const contactPhone = normalize(formData.get("contactPhone"));
  const website = normalize(formData.get("website"));
  const country = normalize(formData.get("country"));
  const city = normalize(formData.get("city"));
  const address = normalize(formData.get("address"));
  const registrationNumber = normalize(formData.get("registrationNumber"));
  const adminName = normalize(formData.get("adminName"));
  const adminUsername = normalize(formData.get("adminUsername"));
  const adminEmail = normalize(formData.get("adminEmail"));
  const adminPassword = normalize(formData.get("adminPassword"));

  const missingFields: string[] = [];
  if (!schoolName) missingFields.push("School Name");
  if (!contactEmail) missingFields.push("School Email");
  if (!contactPhone) missingFields.push("School Phone");
  if (!country) missingFields.push("Country");
  if (!city) missingFields.push("City");
  if (!address) missingFields.push("School Address");
  if (!adminName) missingFields.push("Admin Full Name");
  if (!adminUsername) missingFields.push("Admin Username");
  if (!adminPassword) missingFields.push("Admin Password");

  if (missingFields.length > 0) {
    return {
      success: false,
      message: `Missing required fields: ${missingFields.join(", ")}.`,
    };
  }

  let createdClerkUserId: string | null = null;

  try {
    const existingSchool = await prisma.school.findUnique({
      where: { name: schoolName },
      select: { id: true },
    });

    if (existingSchool) {
      return {
        success: false,
        message: "A school with this name already exists.",
      };
    }

    const existingAdminUsername = await prisma.admin.findFirst({
      where: { username: adminUsername },
      select: { id: true },
    });

    if (existingAdminUsername) {
      return {
        success: false,
        message: "This admin username is already in use.",
      };
    }

    const user = await (await clerkClient()).users.createUser({
      username: adminUsername,
      password: adminPassword,
      firstName: adminName,
      ...(adminEmail ? { emailAddress: [adminEmail] } : {}),
      publicMetadata: { role: "admin" },
    });
    createdClerkUserId = user.id;

    await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: schoolName,
          contactEmail,
          contactPhone,
          website: website || null,
          country,
          city,
          address,
          registrationNumber: registrationNumber || null,
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
      message:
        getReadableActionErrorMessage(error) ||
        "Unable to submit school request. Please check your details and try again.",
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
