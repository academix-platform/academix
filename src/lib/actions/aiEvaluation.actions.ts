"use server";

import { revalidatePath } from "next/cache";
import { AiEvaluationStatus, Prisma } from "@prisma/client";
import {
  downloadCloudinaryUrlToBuffer,
  downloadPrivateCloudinaryFileToBuffer,
} from "@/lib/ai/cloudinaryFile";
import { evaluateWithGemini } from "@/lib/ai/geminiEvaluation";
import type { AiEvaluationSuggestion } from "@/lib/ai/evaluationPrompt";
import { assignmentManagerWhere } from "@/lib/assignments/group";
import { deleteAssignmentResultsForSubmissions } from "@/lib/assignments/results";
import { canManageExamGroup } from "@/lib/exams/group";
import { finalizeGrade, unpublishExamGradeWrites } from "@/lib/exams/grading";
import prisma from "@/lib/prisma";
import { requireActionAccess } from "./helpers";

// An AI result is only a suggestion. Evaluating stores it on the AiEvaluation
// row and never touches the grade; the grade changes only when a teacher
// approves the suggestion (with the score and feedback they confirm).

type AiActionResult = {
  success: boolean;
  error: boolean;
  message: string;
};

type Access = Exclude<Awaited<ReturnType<typeof requireActionAccess>>, { error: true }>;

const fail = (message: string): AiActionResult => ({
  success: false,
  error: true,
  message,
});

const SUGGESTION_SAVED =
  "AI suggestion saved. Review it and approve it to apply the score.";

const getFileExtension = (fileName?: string | null) =>
  fileName?.split(".").pop()?.toLowerCase() ?? "";

const isPdf = (fileName?: string | null) => getFileExtension(fileName) === "pdf";

const ensurePdf = (fileName?: string | null) => {
  if (!isPdf(fileName)) {
    throw new Error("AI evaluation currently supports PDF files only.");
  }
};

const evaluationTarget = (
  target: { answerId: number } | { assignmentSubmissionId: number },
) =>
  "answerId" in target
    ? { where: { answerId: target.answerId }, create: { answerId: target.answerId } }
    : {
        where: { assignmentSubmissionId: target.assignmentSubmissionId },
        create: { assignmentSubmissionId: target.assignmentSubmissionId },
      };

const recordFailure = async (
  schoolId: number,
  target: { answerId: number } | { assignmentSubmissionId: number },
  maxScore: number,
  error: string,
) => {
  const data = {
    schoolId,
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
    status: AiEvaluationStatus.FAILED,
    score: null,
    maxScore,
    feedback: null,
    strengths: [],
    weaknesses: [],
    needsReview: true,
    error,
  };
  const { where, create } = evaluationTarget(target);
  await prisma.aiEvaluation.upsert({
    where,
    create: { ...data, ...create },
    update: data,
  });
};

const saveSuggestion = (
  db: Prisma.TransactionClient,
  schoolId: number,
  target: { answerId: number } | { assignmentSubmissionId: number },
  maxScore: number,
  model: string,
  suggestion: AiEvaluationSuggestion,
) => {
  const data = {
    schoolId,
    model,
    status: AiEvaluationStatus.SUGGESTED,
    score: suggestion.score,
    maxScore,
    feedback: suggestion.feedback,
    strengths: suggestion.strengths,
    weaknesses: suggestion.weaknesses,
    needsReview: suggestion.needsReview,
    error: null,
    approvedScore: null,
    approvedFeedback: null,
    approvedBy: null,
    approvedAt: null,
  };
  const { where, create } = evaluationTarget(target);
  return db.aiEvaluation.upsert({
    where,
    create: { ...data, ...create },
    update: data,
  });
};

const validScore = (score: number, maxScore: number) =>
  Number.isFinite(score) && score >= 0 && score <= maxScore;

const findPendingSuggestion = (
  evaluationId: number,
  schoolId: number,
  kind: "answerId" | "assignmentSubmissionId",
) =>
  prisma.aiEvaluation.findFirst({
    where: { id: evaluationId, schoolId, [kind]: { not: null } },
    select: {
      id: true,
      status: true,
      feedback: true,
      answerId: true,
      assignmentSubmissionId: true,
    },
  });

const approvalFields = (access: Access, score: number, feedback: string | null) => ({
  status: AiEvaluationStatus.APPROVED,
  approvedScore: score,
  approvedFeedback: feedback,
  approvedBy: access.userId,
  approvedAt: new Date(),
  needsReview: false,
});

// ─── Exam answers ─────────────────────────────────────────────────────────────

const findManagedAnswer = async (answerId: number, access: Access) => {
  const answer = await prisma.answer.findFirst({
    where: { id: answerId, schoolId: access.schoolId },
    include: {
      question: true,
      submission: {
        select: {
          id: true,
          examId: true,
          studentId: true,
          schoolId: true,
          status: true,
          exam: { select: { groupId: true, schoolId: true } },
        },
      },
    },
  });
  if (!answer) return null;

  const { exam } = answer.submission;
  return (await canManageExamGroup(exam.groupId, exam.schoolId, access))
    ? answer
    : null;
};

const examSubmissionPath = (answer: {
  submission: { examId: number; id: number };
}) => `/list/exams/${answer.submission.examId}/submissions/${answer.submission.id}`;

export async function evaluateExamAnswerWithAi(
  answerId: number,
): Promise<AiActionResult> {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return fail(access.message);

  const answer = await findManagedAnswer(answerId, access);
  if (!answer) return fail("Answer not found.");

  // Answers can still change while the attempt is open.
  if (answer.submission.status === "IN_PROGRESS") {
    return fail("This exam is still in progress.");
  }

  if (answer.question.type !== "TEXT" && answer.question.type !== "FILE") {
    return fail("AI evaluation is only available for text and file answers.");
  }

  const maxScore = answer.question.points;
  const target = { answerId };
  const modelAnswer =
    answer.question.textAnswer || answer.question.correctAnswer?.join(", ") || null;

  try {
    let result: Awaited<ReturnType<typeof evaluateWithGemini>>;

    if (answer.question.type === "FILE") {
      ensurePdf(answer.fileOriginalName);
      if (!answer.filePublicId) throw new Error("No file was uploaded.");
      const studentPdf = await downloadPrivateCloudinaryFileToBuffer(
        answer.filePublicId,
        getFileExtension(answer.fileOriginalName) || "pdf",
      );
      result = await evaluateWithGemini({
        questionText: answer.question.text,
        modelAnswer,
        maxScore,
        studentPdf,
      });
    } else {
      const studentAnswer = answer.textAnswer ?? "";
      if (!studentAnswer.trim()) throw new Error("Student answer is empty.");
      result = await evaluateWithGemini({
        questionText: answer.question.text,
        modelAnswer,
        maxScore,
        studentAnswer,
      });
    }

    await saveSuggestion(
      prisma,
      access.schoolId,
      target,
      maxScore,
      result.model,
      result.suggestion,
    );

    revalidatePath(examSubmissionPath(answer));
    return { success: true, error: false, message: SUGGESTION_SAVED };
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI evaluation failed.";
    await recordFailure(access.schoolId, target, maxScore, message);
    revalidatePath(examSubmissionPath(answer));
    return fail(message);
  }
}

export async function approveExamAnswerAiEvaluation(
  evaluationId: number,
  score: number,
  feedback?: string,
): Promise<AiActionResult> {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return fail(access.message);

  const evaluation = await findPendingSuggestion(evaluationId, access.schoolId, "answerId");
  const answer = evaluation?.answerId
    ? await findManagedAnswer(evaluation.answerId, access)
    : null;
  if (!evaluation || !answer) return fail("AI evaluation not found.");

  if (evaluation.status !== AiEvaluationStatus.SUGGESTED) {
    return fail("Only a new AI suggestion can be approved.");
  }
  if (answer.submission.status === "IN_PROGRESS") {
    return fail("This exam is still in progress.");
  }
  if (!validScore(score, answer.question.points)) {
    return fail(`Score must be between 0 and ${answer.question.points}.`);
  }

  await prisma.$transaction([
    prisma.answer.update({ where: { id: answer.id }, data: { score } }),
    prisma.aiEvaluation.update({
      where: { id: evaluation.id },
      data: approvalFields(access, score, feedback?.trim() || evaluation.feedback),
    }),
    // The grade changed, so it has to be published again.
    ...unpublishExamGradeWrites(answer.submission),
  ]);
  await finalizeGrade(answer.submission.id);

  revalidatePath(examSubmissionPath(answer));
  return { success: true, error: false, message: "AI score approved and applied." };
}

// ─── Assignment submissions ───────────────────────────────────────────────────

const findManagedAssignmentSubmission = (submissionId: number, access: Access) =>
  prisma.assignmentSubmission.findFirst({
    where: {
      id: submissionId,
      schoolId: access.schoolId,
      assignment: assignmentManagerWhere(access),
    },
    select: {
      id: true,
      fileUrl: true,
      fileName: true,
      assignmentId: true,
      studentId: true,
      academicYearId: true,
      assignment: {
        select: {
          title: true,
          description: true,
          rubric: true,
          maxScore: true,
          fileUrl: true,
          fileName: true,
        },
      },
    },
  });

/** The teacher's guidance: description and rubric together. */
const assignmentGuide = (assignment: {
  description: string | null;
  rubric: string | null;
}) =>
  [
    assignment.description?.trim() && `Description:\n${assignment.description.trim()}`,
    assignment.rubric?.trim() && `Rubric:\n${assignment.rubric.trim()}`,
  ]
    .filter(Boolean)
    .join("\n\n") || null;

/** The assignment's attached instructions, when they are a PDF the model can read. */
const loadInstructionsPdf = async (assignment: {
  fileUrl: string | null;
  fileName: string | null;
}) => {
  if (!assignment.fileUrl || !isPdf(assignment.fileName ?? assignment.fileUrl)) {
    return null;
  }
  try {
    return await downloadCloudinaryUrlToBuffer(assignment.fileUrl);
  } catch {
    // Grade without it rather than failing; the teacher still reviews.
    console.warn("[evaluateAssignmentSubmissionWithAi] Could not load the assignment file.");
    return null;
  }
};

const revalidateAssignment = (assignmentId: number) => {
  revalidatePath(`/list/assignments/${assignmentId}/submissions`);
  revalidatePath("/list/assignments");
};

export async function evaluateAssignmentSubmissionWithAi(
  submissionId: number,
): Promise<AiActionResult> {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return fail(access.message);

  const submission = await findManagedAssignmentSubmission(submissionId, access);
  if (!submission) return fail("Submission not found.");

  const { assignment } = submission;
  const target = { assignmentSubmissionId: submissionId };

  try {
    ensurePdf(submission.fileName);
    const [studentPdf, instructionsPdf] = await Promise.all([
      downloadCloudinaryUrlToBuffer(submission.fileUrl),
      loadInstructionsPdf(assignment),
    ]);

    const { suggestion, model } = await evaluateWithGemini({
      questionText: assignment.title,
      modelAnswer: assignmentGuide(assignment),
      maxScore: assignment.maxScore,
      studentPdf,
      instructionsPdf,
    });

    // The student may have replaced the file while the model was working.
    // Lock the row so a resubmission can't slip in between check and save;
    // a resubmission deletes the suggestion, so it must run after this.
    const saved = await prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ fileUrl: string }[]>`
        SELECT "fileUrl" FROM "AssignmentSubmission" WHERE "id" = ${submissionId} FOR UPDATE`;
      if (rows[0]?.fileUrl !== submission.fileUrl) return false;

      await saveSuggestion(tx, access.schoolId, target, assignment.maxScore, model, suggestion);
      return true;
    });

    if (!saved) {
      return fail(
        "The student replaced the file during the evaluation. Run the AI evaluation again.",
      );
    }

    revalidateAssignment(submission.assignmentId);
    return { success: true, error: false, message: SUGGESTION_SAVED };
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI evaluation failed.";
    await recordFailure(access.schoolId, target, assignment.maxScore, message);
    revalidateAssignment(submission.assignmentId);
    return fail(message);
  }
}

export async function approveAssignmentSubmissionAiEvaluation(
  evaluationId: number,
  score: number,
  feedback?: string,
): Promise<AiActionResult> {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return fail(access.message);

  const evaluation = await findPendingSuggestion(
    evaluationId,
    access.schoolId,
    "assignmentSubmissionId",
  );
  const submission = evaluation?.assignmentSubmissionId
    ? await findManagedAssignmentSubmission(evaluation.assignmentSubmissionId, access)
    : null;
  if (!evaluation || !submission) return fail("AI evaluation not found.");

  if (evaluation.status !== AiEvaluationStatus.SUGGESTED) {
    return fail("Only a new AI suggestion can be approved.");
  }
  if (!validScore(score, submission.assignment.maxScore)) {
    return fail(`Score must be between 0 and ${submission.assignment.maxScore}.`);
  }

  const approvedFeedback = feedback?.trim() || evaluation.feedback;

  await prisma.$transaction(async (tx) => {
    await tx.assignmentSubmission.update({
      where: { id: submission.id },
      data: {
        score,
        teacherFeedback: approvedFeedback,
        gradePublished: false,
        gradedAt: new Date(),
        gradedBy: access.userId,
      },
    });
    await tx.aiEvaluation.update({
      where: { id: evaluation.id },
      data: approvalFields(access, score, approvedFeedback),
    });
    // The grade changed and is unpublished again, so the old Result goes too.
    await deleteAssignmentResultsForSubmissions(tx, access.schoolId, [submission]);
  });

  revalidateAssignment(submission.assignmentId);
  revalidatePath("/list/results");
  return { success: true, error: false, message: "AI score approved and applied." };
}
