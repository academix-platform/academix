"use server";

import { notifyAttendanceSaved } from "./notification.actions";
import prisma from "../prisma";
import { getCurrentAcademicYearOrNull } from "../academicYears";
import {
  ATTENDING_STUDENT_STATUSES,
  attendanceDateError,
  parseAttendanceRecords,
  todayInTimeZone,
} from "../attendanceRules";
import { requireActionAccess } from "./helpers";

const fail = (message: string) => ({ success: false, error: true, message });

/**
 * Saves one day's attendance. The form sends every row shown on the page
 * (id → present), so people left as "absent" are recorded too.
 */
export const saveDailyAttendance = async (
  prevState: unknown,
  formData: FormData,
) => {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;

  try {
    const year = await getCurrentAcademicYearOrNull(access.schoolId);
    if (!year) {
      return fail(
        "No current academic year found. Create one and mark it as current in settings.",
      );
    }

    const scope = formData.get("scope");
    if (scope !== "students" && scope !== "teachers") {
      return fail("Invalid scope.");
    }
    // Teachers take attendance for their classes only, never for staff.
    if (scope === "teachers" && access.role !== "admin") {
      return fail("You are not allowed to perform this action.");
    }

    const rawDate = formData.get("date");
    const dateError = attendanceDateError(rawDate, todayInTimeZone(), year);
    if (dateError) return fail(dateError);
    const date = rawDate as string;
    const day = new Date(`${date}T00:00:00.000Z`);

    const records = parseAttendanceRecords(formData.get("records"));
    if (!records) return fail("Invalid attendance data.");
    const ids = [...records.keys()];

    // Every id must be someone the caller may take attendance for.
    const allowed =
      scope === "students"
        ? await prisma.student.count({
            where: {
              id: { in: ids },
              schoolId: access.schoolId,
              status: { in: [...ATTENDING_STUDENT_STATUSES] },
              ...(access.role === "teacher"
                ? { class: { supervisorId: access.userId } }
                : {}),
            },
          })
        : await prisma.teacher.count({
            where: { id: { in: ids }, schoolId: access.schoolId },
          });

    if (allowed !== ids.length) {
      return fail(
        scope === "students"
          ? "Some students aren't in your classes, or are no longer active."
          : "Some teachers weren't found in your school.",
      );
    }

    await prisma.$transaction(
      ids.map((id) => {
        const present = records.get(id)!;

        if (scope === "students") {
          return prisma.attendance.upsert({
            where: {
              studentId_academicYearId_date: {
                studentId: id,
                academicYearId: year.id,
                date: day,
              },
            },
            update: { present },
            create: {
              schoolId: access.schoolId,
              studentId: id,
              academicYearId: year.id,
              date: day,
              present,
            },
          });
        }

        return prisma.attendance.upsert({
          where: {
            teacherId_academicYearId_date: {
              teacherId: id,
              academicYearId: year.id,
              date: day,
            },
          },
          update: { present },
          create: {
            schoolId: access.schoolId,
            teacherId: id,
            academicYearId: year.id,
            date: day,
            present,
          },
        });
      }),
    );

    // ✅ إشعار الأدمن بحفظ الحضور
    await notifyAttendanceSaved({
      schoolId: access.schoolId,
      scope,
      date,
      count: ids.length,
    }).catch(() => {});

    return { success: true, error: false, message: "" };
  } catch (err) {
    console.error(err);
    return fail(err instanceof Error ? err.message : "Something went wrong!");
  }
};
