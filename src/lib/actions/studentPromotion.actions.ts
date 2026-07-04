"use server";

import prisma from "../prisma";
import {
  calculateFinalResultSummary,
  PASSING_AVERAGE,
  type AssessmentScore,
} from "../finalResults";
import {
  errorResult,
  requireActionAccess,
  successResult,
} from "./helpers";
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
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  try {
    const currentAcademicYearId = (
      await prisma.academicYear.findFirst({
        where: { schoolId: access.schoolId, isCurrent: true },
        select: { id: true },
      })
    )?.id ?? null;

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
          where: { schoolId: access.schoolId },
        });

        const localClasses = await tx.class.findMany({
          select: { id: true, gradeId: true },
          orderBy: { id: "asc" },
          where: { schoolId: access.schoolId },
        });

        const localEnrollments = await (
          tx as unknown as {
            studentAcademicYear: {
              findMany: (args: {
                where: {
                  academicYearId: number;
                  schoolId?: number;
                  student: {
                    schoolId?: number;
                    status: { in: Array<"ACTIVE" | "REPEATED"> };
                  };
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
            schoolId: access.schoolId,
            student: {
              schoolId: access.schoolId,
              status: { in: ["ACTIVE", "REPEATED"] },
            },
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
          "No active or repeated students were found for the current academic year.",
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

    const studentIds = enrollments.map((enrollment) => enrollment.studentId);
    const results =
      studentIds.length > 0
        ? await prisma.result.findMany({
            where: {
              schoolId: access.schoolId,
              academicYearId: currentAcademicYearId,
              studentId: { in: studentIds },
            },
            select: {
              studentId: true,
              score: true,
              assignment: {
                select: {
                  maxScore: true,
                },
              },
              exam: {
                select: {
                  questions: {
                    select: {
                      points: true,
                    },
                  },
                },
              },
            },
          })
        : [];

    const scoresByStudent = new Map<string, AssessmentScore[]>();

    for (const result of results) {
      const examMaxScore =
        result.exam?.questions.reduce(
          (sum, question) => sum + question.points,
          0,
        ) ?? null;
      const maxScore = result.assignment?.maxScore ?? examMaxScore;
      const existingScores = scoresByStudent.get(result.studentId) ?? [];

      existingScores.push({
        score: result.score,
        maxScore,
      });
      scoresByStudent.set(result.studentId, existingScores);
    }

    await prisma.$transaction(async (tx) => {
      for (const enrollment of enrollments) {
        const currentGrade = gradeById.get(enrollment.gradeId);
        const finalSummary = calculateFinalResultSummary(
          scoresByStudent.get(enrollment.studentId) ?? [],
        );

        if (!currentGrade || finalSummary.averageScore === null) {
          skippedCount += 1;
          continue;
        }

        await (
          tx as unknown as {
            studentFinalResult: {
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
          }
        ).studentFinalResult.upsert({
          where: {
            schoolId_studentId_academicYearId: {
              schoolId: access.schoolId,
              studentId: enrollment.studentId,
              academicYearId: currentAcademicYearId,
            },
          },
          create: {
            schoolId: access.schoolId,
            studentId: enrollment.studentId,
            academicYearId: currentAcademicYearId,
            averageScore: finalSummary.averageScore,
            assessmentCount: finalSummary.assessmentCount,
            status:
              finalSummary.averageScore >= PASSING_AVERAGE ? "PASS" : "FAIL",
          },
          update: {
            averageScore: finalSummary.averageScore,
            assessmentCount: finalSummary.assessmentCount,
            status:
              finalSummary.averageScore >= PASSING_AVERAGE ? "PASS" : "FAIL",
          },
        });

        if (finalSummary.averageScore < PASSING_AVERAGE) {
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
