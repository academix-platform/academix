"use server";

import prisma from "../prisma";
import { getAuthUser } from "../auth";

export const saveDailyAttendance = async (
  prevState: any,
  formData: FormData,
) => {
  const user = await getAuthUser();
  const role = user?.role;
  const userId = user?.userId;

  if (role !== "admin" && role !== "teacher") {
    return {
      success: false,
      error: true,
      message: "You are not allowed to manage attendance.",
    };
  }

  const date = new Date(formData.get("date") as string);

  const raw = formData.get("changes");

  if (!raw || typeof raw !== "string") {
    return {
      success: false,
      error: true,
      message: "No changes detected.",
    };
  }

  const changes = JSON.parse(raw) as Record<string, boolean>;

  const records = Object.entries(changes).map(([id, present]) => ({
    id,
    present,
  }));

  if (records.length === 0) {
    return {
      success: false,
      error: true,
      message: "No changes to save.",
    };
  }

  // ❗ safety
  if (records.length === 0) {
    return {
      success: false,
      error: true,
      message: "No attendance data submitted.",
    };
  }

  try {
    // =========================
    // STUDENT ATTENDANCE
    // =========================
    await prisma.$transaction(
      records.map((record) =>
        prisma.attendance.upsert({
          where: {
            studentId_date: {
              studentId: record.id,
              date,
            },
          },
          update: {
            present: record.present,
          },
          create: {
            studentId: record.id,
            date,
            present: record.present,
          },
        }),
      ),
    );

    return {
      success: true,
      error: false,
      message: "Attendance saved successfully",
    };
  } catch (err) {
    console.error(err);
    return {
      success: false,
      error: true,
      message: "Something went wrong while saving attendance.",
    };
  }
};
