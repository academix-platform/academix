"use server";

import { getCurrentAcademicYearIdOrNull } from "../academicYears";
import prisma from "../prisma";
import { ensureAdminAccess, errorResult, successResult } from "./helpers";
import type { CurrentState } from "./helpers";

export type PromotionActionResult = {
  success: boolean;
  error: boolean;
  message?: string;
  promotedCount?: number;
  graduatedCount?: number;
  repeatedCount?: number;
  skippedCount?: number;
};

export const promoteStudentsByPerformance = async (
  currentState: CurrentState,
): Promise<PromotionActionResult> => {
  const adminError = await ensureAdminAccess();
  if (adminError) return adminError;

  try {
    const currentAcademicYearId = await getCurrentAcademicYearIdOrNull();

    if (!currentAcademicYearId) {
      return {
        success: false,
        error: true,
        message: "No current academic year selected.",
        promotedCount: 0,
        graduatedCount: 0,
        repeatedCount: 0,
        skippedCount: 0,
      };
    }

    const [grades, classes, enrollments] = await prisma.$transaction(
      async (tx) => {
        const localGrades = await tx.grade.findMany({
          select: { id: true, level: true },
          orderBy: { level: "asc" },
        });

        const localClasses = await tx.class.findMany({
          select: { id: true, gradeId: true },
          orderBy: { id: "asc" },
        });

        const localEnrollments = await (
          tx as unknown as {
            studentAcademicYear: {
              findMany: (args: {
                where: {
                  academicYearId: number;
                  performanceStatus: { in: Array<"PASS" | "FAIL"> };
                  student: { status: { in: Array<"ACTIVE" | "REPEATED"> } };
                };
                select: {
                  id: boolean;
                  performanceStatus: boolean;
                  gradeId: boolean;
                  classId: boolean;
                  studentId: boolean;
                };
              }) => Promise<
                Array<{
                  id: number;
                  performanceStatus: "PASS" | "FAIL" | null;
                  gradeId: number;
                  classId: number | null;
                  studentId: string;
                }>
              >;
            };
          }
        ).studentAcademicYear.findMany({
          where: {
            academicYearId: currentAcademicYearId,
            performanceStatus: { in: ["PASS", "FAIL"] },
            student: { status: { in: ["ACTIVE", "REPEATED"] } },
          },
          select: {
            id: true,
            performanceStatus: true,
            gradeId: true,
            classId: true,
            studentId: true,
          },
        });

        return [localGrades, localClasses, localEnrollments] as const;
      },
    );

    if (enrollments.length === 0) {
      return {
        success: false,
        error: true,
        message:
          "No active or repeated students with PASS/FAIL performance status were found for the current academic year.",
        promotedCount: 0,
        graduatedCount: 0,
        repeatedCount: 0,
        skippedCount: 0,
      };
    }

    const gradeById = new Map(grades.map((grade) => [grade.id, grade]));
    const gradeByLevel = new Map(grades.map((grade) => [grade.level, grade]));
    const highestGradeLevel = grades[grades.length - 1]?.level ?? 0;

    const firstClassByGradeId = new Map<number, number>();
    for (const cls of classes) {
      if (!firstClassByGradeId.has(cls.gradeId)) {
        firstClassByGradeId.set(cls.gradeId, cls.id);
      }
    }

    let promotedCount = 0;
    let graduatedCount = 0;
    let repeatedCount = 0;
    let skippedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const enrollment of enrollments) {
        const currentGrade = gradeById.get(enrollment.gradeId);
        if (!currentGrade || !enrollment.performanceStatus) {
          skippedCount += 1;
          continue;
        }

        if (enrollment.performanceStatus === "FAIL") {
          await tx.student.update({
            where: { id: enrollment.studentId },
            data: {
              status: "REPEATED",
              repeatCount: { increment: 1 },
            },
          } as any);
          await tx.studentAcademicYear.update({
            where: { id: enrollment.id },
            data: { performanceStatus: null },
          });
          repeatedCount += 1;
          continue;
        }

        if (currentGrade.level >= highestGradeLevel) {
          await tx.student.update({
            where: { id: enrollment.studentId },
            data: {
              status: "GRADUATED",
            },
          } as any);
          await tx.studentAcademicYear.update({
            where: { id: enrollment.id },
            data: { performanceStatus: null },
          });
          graduatedCount += 1;
          continue;
        }

        const nextGrade = gradeByLevel.get(currentGrade.level + 1);
        if (!nextGrade) {
          skippedCount += 1;
          continue;
        }

        await tx.student.update({
          where: { id: enrollment.studentId },
          data: {
            status: "ACTIVE",
            gradeId: nextGrade.id,
            classId: firstClassByGradeId.get(nextGrade.id) ?? undefined,
          },
        } as any);
        await tx.studentAcademicYear.update({
          where: { id: enrollment.id },
          data: { performanceStatus: null },
        });

        promotedCount += 1;
      }
    });

    const summary = `Promotion run completed. Promoted: ${promotedCount}, Graduated: ${graduatedCount}, Repeated: ${repeatedCount}, Skipped: ${skippedCount}.`;

    const result = successResult(["/list/students", "/list/classes"]);
    return {
      ...result,
      message: summary,
      promotedCount,
      graduatedCount,
      repeatedCount,
      skippedCount,
    };
  } catch (err) {
    return errorResult(err);
  }
};
