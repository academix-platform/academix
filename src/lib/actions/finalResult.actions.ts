"use server";

import { revalidatePath } from "next/cache";
import { PASSING_AVERAGE } from "@/lib/finalResults";
import prisma from "@/lib/prisma";
import {
  type CurrentState,
  errorResult,
  requireActionAccess,
} from "./helpers";

export const updateStudentFinalGrade = async (
  currentState: CurrentState,
  formData: FormData,
) => {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;

  const studentId = String(formData.get("studentId") ?? "");
  const academicYearId = Number(formData.get("academicYearId"));
  const averageScore = Number(formData.get("averageScore"));

  if (!studentId || Number.isNaN(academicYearId) || academicYearId < 1) {
    return {
      success: false,
      error: true,
      message: "Invalid student or academic year.",
    };
  }

  if (Number.isNaN(averageScore) || averageScore < 0 || averageScore > 100) {
    return {
      success: false,
      error: true,
      message: "Final grade must be between 0 and 100.",
    };
  }

  try {
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: access.schoolId,
      },
      select: {
        id: true,
        class: {
          select: {
            supervisorId: true,
          },
        },
      },
    });

    if (!student) {
      return {
        success: false,
        error: true,
        message: "Student was not found.",
      };
    }

    if (access.role === "teacher" && student.class.supervisorId !== access.userId) {
      return {
        success: false,
        error: true,
        message: "You can only edit final grades for classes you supervise.",
      };
    }

    const status = averageScore >= PASSING_AVERAGE ? "PASS" : "FAIL";
    const roundedAverage = Math.round(averageScore * 100) / 100;
    // Marked manual so promotion uses it as-is instead of recomputing it.
    const manualResult = {
      averageScore: roundedAverage,
      assessmentCount: 0,
      status,
      isManual: true,
    };

    await prisma.studentFinalResult.upsert({
      where: {
        schoolId_studentId_academicYearId: {
          schoolId: access.schoolId,
          studentId,
          academicYearId,
        },
      },
      create: {
        schoolId: access.schoolId,
        studentId,
        academicYearId,
        ...manualResult,
      },
      update: manualResult,
    });

    revalidatePath("/list/final-results");
    revalidatePath("/archive");

    return {
      success: true,
      error: false,
      message: "Final grade updated.",
    };
  } catch (err) {
    return errorResult(err);
  }
};
