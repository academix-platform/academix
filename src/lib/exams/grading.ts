import "server-only";
import { Prisma } from "@prisma/client";
import prisma from "../prisma";
import { getAutoGradeScore } from "../examAnswerUtils";
import { getExamEndsAt } from "./timing";

// Internal grading and submission helpers. This module is deliberately NOT a
// "use server" file: nothing here checks the caller, so it must never be
// reachable from the browser. Callers authorise first.

const fillUnansweredQuestions = async (
  tx: Prisma.TransactionClient,
  submissionId: number,
  examId: number,
  schoolId: number,
) => {
  const [allQuestions, existingAnswers] = await Promise.all([
    tx.question.findMany({ where: { examId }, select: { id: true } }),
    tx.answer.findMany({ where: { submissionId }, select: { questionId: true } }),
  ]);

  const answeredQuestionIds = new Set(existingAnswers.map((a) => a.questionId));
  const unanswered = allQuestions.filter((q) => !answeredQuestionIds.has(q.id));

  if (unanswered.length > 0) {
    await tx.answer.createMany({
      data: unanswered.map((q) => ({
        submissionId,
        questionId: q.id,
        schoolId,
        textAnswer: null,
        fileUrl: null,
        score: 0,
        isDraft: false,
      })),
      skipDuplicates: true,
    });
  }
};

/**
 * Moves an IN_PROGRESS submission to SUBMITTED. Returns false when another
 * request already closed it, so a double submit only happens once.
 */
export const closeSubmission = async (
  submission: { id: number; examId: number; schoolId: number },
  options: { autoSubmitted: boolean; totalScore?: number },
) =>
  prisma.$transaction(async (tx) => {
    const claimed = await tx.submission.updateMany({
      where: { id: submission.id, status: "IN_PROGRESS" },
      data: {
        status: "SUBMITTED",
        submittedAt: new Date(),
        autoSubmitted: options.autoSubmitted,
        ...(options.totalScore !== undefined ? { totalScore: options.totalScore } : {}),
      },
    });
    if (claimed.count === 0) return false;

    await fillUnansweredQuestions(tx, submission.id, submission.examId, submission.schoolId);
    await tx.answer.updateMany({
      where: { submissionId: submission.id, isDraft: true },
      data: { isDraft: false },
    });
    return true;
  });

const applyAutoGrades = async (submissionId: number) => {
  const answers = await prisma.answer.findMany({
    where: { submissionId },
    include: {
      question: {
        select: { type: true, correctAnswer: true, allowMultiple: true, points: true },
      },
    },
  });

  const updates: Prisma.PrismaPromise<unknown>[] = [];
  const scores = answers.map((answer) => {
    const isAutoGraded =
      answer.question.type === "TRUE_FALSE" || answer.question.type === "MCQ";
    if (!isAutoGraded || answer.isOverridden) return answer.score;

    const score = getAutoGradeScore(
      answer.textAnswer,
      answer.question.correctAnswer,
      answer.question.allowMultiple,
      answer.question.points,
    );
    if (score !== answer.score) {
      updates.push(prisma.answer.update({ where: { id: answer.id }, data: { score } }));
    }
    return score;
  });

  if (updates.length > 0) await prisma.$transaction(updates);

  return {
    allGraded: scores.every((score) => score !== null),
    totalScore: scores.reduce<number>((sum, score) => sum + (score ?? 0), 0),
  };
};

/** Re-scores MCQ/TRUE_FALSE answers and marks the submission GRADED when nothing is left. */
export const autoGrade = async (submissionId: number) => {
  const { allGraded, totalScore } = await applyAutoGrades(submissionId);

  await prisma.submission.update({
    where: { id: submissionId },
    data: { totalScore, status: allGraded ? "GRADED" : "SUBMITTED" },
  });
};

/** Re-scores auto-graded answers without changing the submission status. */
export const syncAutoGrades = async (submissionId: number) => {
  const { totalScore } = await applyAutoGrades(submissionId);

  await prisma.submission.update({
    where: { id: submissionId },
    data: { totalScore },
  });
};

/** Marks the submission GRADED once every answer has a score. */
export const finalizeGrade = async (submissionId: number) => {
  const answers = await prisma.answer.findMany({
    where: { submissionId },
    select: { score: true },
  });

  if (!answers.every((a) => a.score !== null)) return;

  const totalScore = answers.reduce((sum, a) => sum + (a.score ?? 0), 0);

  await prisma.submission.update({
    where: { id: submissionId },
    data: { totalScore, status: "GRADED", gradePublished: false },
  });
};

/**
 * Closes attempts whose time has run out. Pass exam ids to limit the sweep
 * (e.g. the exam group a teacher is viewing); omit them for the cron job.
 */
export const autoSubmitExpiredSubmissions = async (
  examIds?: number[],
): Promise<{ processed: number; submitted: number }> => {
  try {
    const now = new Date();

    const submissions = await prisma.submission.findMany({
      where: {
        status: "IN_PROGRESS",
        ...(examIds ? { examId: { in: examIds } } : {}),
      },
      select: {
        id: true,
        examId: true,
        schoolId: true,
        startedAt: true,
        extraTime: true,
        exam: { select: { enableTimer: true, duration: true, endTime: true } },
        answers: { select: { textAnswer: true, fileUrl: true } },
      },
    });

    let submitted = 0;

    for (const submission of submissions) {
      if (now <= getExamEndsAt(submission, submission.exam)) continue;

      const hasContent = submission.answers.some(
        (a) => (a.textAnswer && a.textAnswer.trim().length > 0) || a.fileUrl,
      );

      const closed = await closeSubmission(submission, {
        autoSubmitted: true,
        ...(hasContent ? {} : { totalScore: 0 }),
      });
      if (!closed) continue;

      if (hasContent) {
        await autoGrade(submission.id).catch((err) =>
          console.error("[autoSubmitExpiredSubmissions] autoGrade", submission.id, err),
        );
      }

      submitted++;
    }

    return { processed: submissions.length, submitted };
  } catch (err) {
    console.error("[autoSubmitExpiredSubmissions]", err);
    return { processed: 0, submitted: 0 };
  }
};
