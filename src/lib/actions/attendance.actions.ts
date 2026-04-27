// lib/actions.ts
"use server";

import prisma from "../prisma";
import { getAuthUser } from "../auth";

export const saveDailyAttendance = async (
  prevState: any,
  formData: FormData,
) => {
  const user = await getAuthUser();
  const role = user?.role;

  if (role !== "admin" && role !== "teacher") {
    return { success: false, error: true, message: "Unauthorized" };
  }

  try {
    const scope = formData.get("scope");
    if (scope !== "students" && scope !== "teachers") {
      throw new Error("Invalid scope");
    }

    const rawDate = formData.get("date") as string;

    //  normalize date
    const day = new Date(new Date(rawDate).toISOString().slice(0, 10));

    const raw = formData.get("changes");
    if (!raw || typeof raw !== "string") {
      throw new Error("No changes");
    }

    const changes = JSON.parse(raw) as Record<string, boolean>;

    const records = Object.entries(changes);

    await prisma.$transaction(
      records.map(([id, present]) => {
        if (scope === "students") {
          return prisma.attendance.upsert({
            where: {
              studentId_date: {
                studentId: id,
                date: day,
              },
            },
            update: { present },
            create: {
              studentId: id,
              date: day,
              present,
            },
          });
        }

        return prisma.attendance.upsert({
          where: {
            teacherId_date: {
              teacherId: id,
              date: day,
            },
          },
          update: { present },
          create: {
            teacherId: id,
            date: day,
            present,
          },
        });
      }),
    );

    return { success: true, error: false };
  } catch (err: any) {
    console.error(err);
    return { success: false, error: true, message: err.message };
  }
};
