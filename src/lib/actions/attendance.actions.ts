// lib/actions.ts
"use server";

import prisma from "../prisma";
import { getRequiredAcademicYearId, requireActionAccess } from "./helpers";

export const saveDailyAttendance = async (
  prevState: any,
  formData: FormData,
) => {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;

  try {
    const academicYearId = await getRequiredAcademicYearId(access.schoolId);

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
              studentId_academicYearId_date: {
                studentId: id,
                academicYearId,
                date: day,
              },
            },
            update: { present },
            create: {
              schoolId: access.schoolId,
              studentId: id,
              academicYearId,
              date: day,
              present,
            },
          });
        }

        return prisma.attendance.upsert({
          where: {
            teacherId_academicYearId_date: {
              teacherId: id,
              academicYearId,
              date: day,
            },
          },
          update: { present },
          create: {
            schoolId: access.schoolId,
            teacherId: id,
            academicYearId,
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
