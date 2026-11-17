"use server";

import prisma from "../prisma";
import {
  calculateFinalResultSummary,
  PASSING_AVERAGE,
  type AssessmentScore,
} from "../finalResults";
import {
  calculateAnnualGrade,
  calculateWeightedSemesterGrade,
  type WeightedGradeSemesterScore,
} from "../gradeComponents";
import { isAcademicYearFinished } from "../promotion";
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

// The whole school is promoted in one transaction with a few writes per
// student; Prisma's default 5 s limit isn't enough for a large school.
const PROMOTION_TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 120_000 };

const emptyCounts = {
  promotedCount: 0,
  graduatedCount: 0,
  repeatedCount: 0,
  skippedCount: 0,
};

export const promoteStudentsByPerformance = async (
  currentState: CurrentState,
): Promise<PromotionActionResult> => {
  const access = await requireActionAccess(["admin"]);
  if ("error" in access) return access;

  try {
    const currentAcademicYear = await prisma.academicYear.findFirst({
      where: { schoolId: access.schoolId, isCurrent: true },
      select: { id: true, endDate: true },
    });

    if (!currentAcademicYear) {
      return {
        success: false,
        error: true,
        message: "No current academic year selected.",
        ...emptyCounts,
      };
    }

    // The button checks this too, but the action is callable directly.
    if (!isAcademicYearFinished(currentAcademicYear.endDate)) {
      return {
        success: false,
        error: true,
        message: "Students can only be promoted after the academic year has ended.",
        ...emptyCounts,
      };
    }

    const currentAcademicYearId = currentAcademicYear.id;

    const [grades, classes, enrollments] = await prisma.$transaction([
      prisma.grade.findMany({
        select: { id: true, level: true },
        orderBy: { level: "asc" },
        where: { schoolId: access.schoolId },
      }),
      prisma.class.findMany({
        select: { id: true, gradeId: true },
        orderBy: { id: "asc" },
        where: { schoolId: access.schoolId },
      }),
      prisma.studentAcademicYear.findMany({
        where: {
          academicYearId: currentAcademicYearId,
          schoolId: access.schoolId,
          // Each enrollment records its outcome once processed, so running
          // promotion again doesn't promote twice or bump repeatCount again.
          performanceStatus: null,
          student: {
            schoolId: access.schoolId,
            status: { in: ["ACTIVE", "REPEATED"] },
          },
        },
        select: {
          id: true,
          gradeId: true,
          studentId: true,
          classId: true,
        },
      }),
    ]);

    if (enrollments.length === 0) {
      return {
        success: false,
        error: true,
        message:
          "No students are waiting for promotion in the current academic year.",
        ...emptyCounts,
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

    const [results, manualFinalResults] = await Promise.all([
      prisma.result.findMany({
        where: {
          schoolId: access.schoolId,
          academicYearId: currentAcademicYearId,
          studentId: { in: studentIds },
        },
        select: {
          studentId: true,
          score: true,
          semester: true,
          assignment: {
            select: {
              maxScore: true,
              gradeSchemeComponentId: true,
              classId: true,
            },
          },
          exam: {
            select: {
              gradeSchemeComponentId: true,
              classId: true,
              questions: { select: { points: true } },
            },
          },
        },
      }),
      prisma.studentFinalResult.findMany({
        where: {
          schoolId: access.schoolId,
          academicYearId: currentAcademicYearId,
          studentId: { in: studentIds },
          period: { in: ["ANNUAL", "FIRST", "SECOND"] },
          isManual: true,
        },
        select: { studentId: true, period: true, averageScore: true },
      }),
    ]);

    const manualAverageByStudentAndPeriod = new Map(
      manualFinalResults.map((result) => [
        `${result.studentId}:${result.period}`,
        result.averageScore,
      ]),
    );

    const scoresByStudent = new Map<string, AssessmentScore[]>();
    const weightedScoresByStudent = new Map<
      string,
      WeightedGradeSemesterScore[]
    >();

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

      const gradeSchemeComponentId =
        result.assignment?.gradeSchemeComponentId ??
        result.exam?.gradeSchemeComponentId;
      if (gradeSchemeComponentId && result.semester) {
        const weightedScores =
          weightedScoresByStudent.get(result.studentId) ?? [];
        weightedScores.push({
          gradeSchemeComponentId,
          score: result.score,
          maxScore: maxScore ?? 0,
          semester: result.semester,
        });
        weightedScoresByStudent.set(result.studentId, weightedScores);
      }
    }

    const classIds = [
      ...new Set(
        enrollments
          .map(({ classId }) => classId)
          .filter((classId): classId is number => classId !== null),
      ),
    ];
    const gradeSchemes = classIds.length
      ? await prisma.gradeScheme.findMany({
          where: {
            schoolId: access.schoolId,
            academicYearId: currentAcademicYearId,
            classId: { in: classIds },
          },
          select: {
            classId: true,
            semester: true,
            components: { select: { id: true, weight: true } },
          },
        })
      : [];

    await prisma.$transaction(async (tx) => {
      for (const enrollment of enrollments) {
        const currentGrade = gradeById.get(enrollment.gradeId);
        const manualAnnualAverage = manualAverageByStudentAndPeriod.get(
          `${enrollment.studentId}:ANNUAL`,
        );
        const legacySummary = calculateFinalResultSummary(
          scoresByStudent.get(enrollment.studentId) ?? [],
        );
        const studentSchemes = gradeSchemes
          .filter((scheme) => scheme.classId === enrollment.classId)
          .map((scheme) => ({
            semester: scheme.semester,
            components: scheme.components.map((component) => ({
              id: component.id,
              weight: Number(component.weight),
            })),
          }));
        let finalSummary: {
          averageScore: number | null;
          assessmentCount: number;
        } = legacySummary;
        if (studentSchemes.length > 0) {
          const weightedScores =
            weightedScoresByStudent.get(enrollment.studentId) ?? [];
          const firstSemester = calculateWeightedSemesterGrade(
            studentSchemes
              .filter((scheme) => scheme.semester === "FIRST")
              .map(({ components }) => ({ components })),
            weightedScores
              .filter((score) => score.semester === "FIRST")
              .map(({ gradeSchemeComponentId, score, maxScore }) => ({
                gradeSchemeComponentId,
                score,
                maxScore,
              })),
          );
          const secondSemester = calculateWeightedSemesterGrade(
            studentSchemes
              .filter((scheme) => scheme.semester === "SECOND")
              .map(({ components }) => ({ components })),
            weightedScores
              .filter((score) => score.semester === "SECOND")
              .map(({ gradeSchemeComponentId, score, maxScore }) => ({
                gradeSchemeComponentId,
                score,
                maxScore,
              })),
          );
          const manualFirstAverage = manualAverageByStudentAndPeriod.get(
            `${enrollment.studentId}:FIRST`,
          );
          const manualSecondAverage = manualAverageByStudentAndPeriod.get(
            `${enrollment.studentId}:SECOND`,
          );
          if (manualFirstAverage !== undefined) {
            firstSemester.averageScore = manualFirstAverage;
            firstSemester.complete = true;
          }
          if (manualSecondAverage !== undefined) {
            secondSemester.averageScore = manualSecondAverage;
            secondSemester.complete = true;
          }
          finalSummary = calculateAnnualGrade(firstSemester, secondSemester);
        }
        const averageScore = manualAnnualAverage ?? finalSummary.averageScore;

        if (!currentGrade || averageScore === null) {
          skippedCount += 1;
          continue;
        }

        const passed = averageScore >= PASSING_AVERAGE;
        const isFinalGrade = currentGrade.level >= highestGradeLevel;
        const nextGrade = gradeByLevel.get(currentGrade.level + 1);

        // Leave the enrollment unprocessed so a later run can pick it up.
        if (passed && !isFinalGrade && !nextGrade) {
          skippedCount += 1;
          continue;
        }

        if (
          manualAnnualAverage === undefined &&
          finalSummary.averageScore !== null
        ) {
          const computed = {
            averageScore: finalSummary.averageScore,
            assessmentCount: finalSummary.assessmentCount,
            status: passed ? "PASS" : "FAIL",
          };

          await tx.studentFinalResult.upsert({
            where: {
              schoolId_studentId_academicYearId_period: {
                schoolId: access.schoolId,
                studentId: enrollment.studentId,
                academicYearId: currentAcademicYearId,
                period: "ANNUAL",
              },
            },
            create: {
              schoolId: access.schoolId,
              studentId: enrollment.studentId,
              academicYearId: currentAcademicYearId,
              period: "ANNUAL",
              ...computed,
            },
            update: computed,
          });
        }

        await tx.studentAcademicYear.update({
          where: { id: enrollment.id },
          data: { performanceStatus: passed ? "PASS" : "FAIL" },
        });

        if (!passed) {
          await tx.student.update({
            where: { id: enrollment.studentId },
            data: {
              status: "REPEATED",
              repeatCount: { increment: 1 },
            },
          });
          repeatedCount += 1;
          continue;
        }

        if (isFinalGrade || !nextGrade) {
          await tx.student.update({
            where: { id: enrollment.studentId },
            data: { status: "GRADUATED" },
          });
          graduatedCount += 1;
          continue;
        }

        await tx.student.update({
          where: { id: enrollment.studentId },
          data: {
            status: "ACTIVE",
            gradeId: nextGrade.id,
            classId: firstClassByGradeId.get(nextGrade.id) ?? undefined,
          },
        });

        promotedCount += 1;
      }
    }, PROMOTION_TRANSACTION_OPTIONS);

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
