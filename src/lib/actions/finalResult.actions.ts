"use server";

import { revalidatePath } from "next/cache";
import { PASSING_AVERAGE } from "@/lib/finalResults";
import prisma from "@/lib/prisma";
import {
  type CurrentState,
  errorResult,
  requireActionAccess,
} from "./helpers";

type StudentFinalResultDelegate = {
  upsert: (args: {
    where: {
      schoolId_studentId_academicYearId: {
        schoolId: number;
        studentId: string;
        academicYearId: number;
      };
    };
    create: {
      schoolId: number;
      studentId: string;
      academicYearId: number;
      averageScore: number;
      assessmentCount: number;
      status: "PASS" | "FAIL";
    };
    update: {
      averageScore: number;
      assessmentCount: number;
      status: "PASS" | "FAIL";
    };
  }) => Promise<unknown>;
};

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

    await (
      prisma as unknown as {
        studentFinalResult: StudentFinalResultDelegate;
      }
    ).studentFinalResult.upsert({
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
        averageScore: roundedAverage,
        assessmentCount: 0,
        status,
      },
      update: {
        averageScore: roundedAverage,
        assessmentCount: 0,
        status,
      },
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
