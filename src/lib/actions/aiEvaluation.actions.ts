"use server";

import { revalidatePath } from "next/cache";
import { AiEvaluationStatus } from "@prisma/client";
import {
  downloadCloudinaryUrlToBuffer,
  downloadPrivateCloudinaryFileToBuffer,
} from "@/lib/ai/cloudinaryFile";
import { evaluatePdfWithGemini, evaluateWithGemini } from "@/lib/ai/geminiEvaluation";
import prisma from "@/lib/prisma";
import { requireActionAccess } from "./helpers";

type AiActionResult = {
  success: boolean;
  error: boolean;
  message: string;
};

const getFileExtension = (fileName?: string | null) =>
  fileName?.split(".").pop()?.toLowerCase() ?? "";

const failEvaluation = async ({
  schoolId,
  answerId,
  assignmentSubmissionId,
  maxScore,
  model = process.env.GEMINI_MODEL || "gemini-3.5-flash",
  error,
}: {
  schoolId: number;
  answerId?: number;
  assignmentSubmissionId?: number;
  maxScore: number;
  model?: string;
  error: string;
}) => {
  const data = {
    schoolId,
    model,
    status: AiEvaluationStatus.FAILED,
    score: null,
    maxScore,
    feedback: null,
    strengths: [],
    weaknesses: [],
    needsReview: true,
    error,
  };

  if (answerId) {
    await prisma.aiEvaluation.upsert({
      where: { answerId },
      create: { ...data, answerId },
      update: data,
    });
  }

  if (assignmentSubmissionId) {
    await prisma.aiEvaluation.upsert({
      where: { assignmentSubmissionId },
      create: { ...data, assignmentSubmissionId },
      update: data,
    });
  }
};

const saveEvaluation = async ({
  schoolId,
  answerId,
  assignmentSubmissionId,
  maxScore,
  model,
  suggestion,
}: {
  schoolId: number;
  answerId?: number;
  assignmentSubmissionId?: number;
  maxScore: number;
  model: string;
  suggestion: {
    score: number;
    feedback: string;
    strengths: string[];
    weaknesses: string[];
    needsReview: boolean;
  };
}) => {
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

  if (answerId) {
    return prisma.aiEvaluation.upsert({
      where: { answerId },
      create: { ...data, answerId },
      update: data,
    });
  }

  if (assignmentSubmissionId) {
    return prisma.aiEvaluation.upsert({
      where: { assignmentSubmissionId },
      create: { ...data, assignmentSubmissionId },
      update: data,
    });
  }
};

const ensurePdf = (fileName?: string | null) => {
  if (getFileExtension(fileName) !== "pdf") {
    throw new Error("AI evaluation currently supports PDF files only.");
  }
};

const finalizeExamIfAllGraded = async (submissionId: number) => {
  const answers = await prisma.answer.findMany({ where: { submissionId } });
  if (!answers.every((answer) => answer.score !== null)) return;

  const totalScore = answers.reduce((sum, answer) => sum + (answer.score ?? 0), 0);
  await prisma.submission.update({
    where: { id: submissionId },
    data: { totalScore, status: "GRADED", gradePublished: false },
  });
};

export async function evaluateExamAnswerWithAi(
  answerId: number,
): Promise<AiActionResult> {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) {
    return { success: false, error: true, message: access.message };
  }

  const answer = await prisma.answer.findFirst({
    where: {
      id: answerId,
      schoolId: access.schoolId,
      submission: {
        exam:
          access.role === "teacher"
            ? { OR: [{ teacherId: access.userId }, { lesson: { teacherId: access.userId } }] }
            : undefined,
      },
    },
    include: {
      question: true,
      submission: { select: { examId: true } },
    },
  });

  if (!answer) {
    return { success: false, error: true, message: "Answer not found." };
  }

  if (answer.question.type !== "TEXT" && answer.question.type !== "FILE") {
    return {
      success: false,
      error: true,
      message: "AI evaluation is only available for text and file answers.",
    };
  }

  try {
    let evaluationResult: Awaited<ReturnType<typeof evaluateWithGemini>>;

    if (answer.question.type === "FILE") {
      ensurePdf(answer.fileOriginalName);
      if (!answer.filePublicId) throw new Error("No file was uploaded.");
      const buffer = await downloadPrivateCloudinaryFileToBuffer(
        answer.filePublicId,
        getFileExtension(answer.fileOriginalName) || "pdf",
      );

      evaluationResult = await evaluatePdfWithGemini({
        questionText: answer.question.text,
        modelAnswer:
          answer.question.textAnswer ||
          answer.question.correctAnswer?.join(", ") ||
          null,
        pdfBuffer: buffer,
        fileName: answer.fileOriginalName,
        maxScore: answer.question.points,
      });
    } else {
      const studentAnswer = answer.textAnswer ?? "";
      if (!studentAnswer.trim()) {
        throw new Error("Student answer is empty.");
      }

      evaluationResult = await evaluateWithGemini({
        questionText: answer.question.text,
        modelAnswer:
          answer.question.textAnswer ||
          answer.question.correctAnswer?.join(", ") ||
          null,
        studentAnswer,
        maxScore: answer.question.points,
      });
    }

    const { suggestion, model } = evaluationResult;

    await saveEvaluation({
      schoolId: access.schoolId,
      answerId,
      maxScore: answer.question.points,
      model,
      suggestion,
    });

    await prisma.answer.update({
      where: { id: answerId },
      data: { score: suggestion.score, isOverridden: false },
    });
    await prisma.submission.update({
      where: { id: answer.submissionId },
      data: { gradePublished: false },
    });
    await finalizeExamIfAllGraded(answer.submissionId);

    revalidatePath(`/list/exams/${answer.submission.examId}/submissions`);
    return {
      success: true,
      error: false,
      message: "AI evaluation saved and applied as a draft score.",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI evaluation failed.";
    await failEvaluation({
      schoolId: access.schoolId,
      answerId,
      maxScore: answer.question.points,
      error: message,
    });
    revalidatePath(`/list/exams/${answer.submission.examId}/submissions`);
    return { success: false, error: true, message };
  }
}

export async function approveExamAnswerAiEvaluation(
  evaluationId: number,
  score: number,
  feedback?: string,
): Promise<AiActionResult> {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) {
    return { success: false, error: true, message: access.message };
  }

  const evaluation = await prisma.aiEvaluation.findFirst({
    where: {
      id: evaluationId,
      schoolId: access.schoolId,
      answer: {
        submission: {
          exam:
            access.role === "teacher"
              ? { OR: [{ teacherId: access.userId }, { lesson: { teacherId: access.userId } }] }
              : undefined,
        },
      },
    },
    include: {
      answer: { include: { submission: true, question: true } },
    },
  });

  if (!evaluation?.answer) {
    return { success: false, error: true, message: "AI evaluation not found." };
  }

  if (!Number.isFinite(score) || score < 0 || score > evaluation.maxScore) {
    return {
      success: false,
      error: true,
      message: `Score must be between 0 and ${evaluation.maxScore}.`,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.answer.update({
      where: { id: evaluation.answerId! },
      data: {
        score,
        isOverridden:
          evaluation.answer!.question.type === "MCQ" ||
          evaluation.answer!.question.type === "TRUE_FALSE",
      },
    });

    await tx.aiEvaluation.update({
      where: { id: evaluationId },
      data: {
        status: AiEvaluationStatus.APPROVED,
        approvedScore: score,
        approvedFeedback: feedback?.trim() || evaluation.feedback,
        approvedBy: access.userId,
        approvedAt: new Date(),
        needsReview: false,
      },
    });

    await tx.submission.update({
      where: { id: evaluation.answer!.submissionId },
      data: { gradePublished: false },
    });
  });

  await finalizeExamIfAllGraded(evaluation.answer.submissionId);
  revalidatePath(`/list/exams/${evaluation.answer.submission.examId}/submissions`);
  return { success: true, error: false, message: "AI score approved." };
}

export async function evaluateAssignmentSubmissionWithAi(
  submissionId: number,
): Promise<AiActionResult> {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) {
    return { success: false, error: true, message: access.message };
  }

  const submission = await prisma.assignmentSubmission.findFirst({
    where: {
      id: submissionId,
      schoolId: access.schoolId,
      assignment:
        access.role === "teacher"
          ? { OR: [{ teacherId: access.userId }, { lesson: { teacherId: access.userId } }] }
          : undefined,
    },
    include: {
      assignment: {
        select: {
          id: true,
          title: true,
          description: true,
          rubric: true,
          maxScore: true,
        },
      },
    },
  });

  if (!submission) {
    return { success: false, error: true, message: "Submission not found." };
  }

  try {
    ensurePdf(submission.fileName);
    const buffer = await downloadCloudinaryUrlToBuffer(submission.fileUrl);

    const { suggestion, model } = await evaluatePdfWithGemini({
      questionText: submission.assignment.title,
      modelAnswer: submission.assignment.rubric || submission.assignment.description,
      pdfBuffer: buffer,
      fileName: submission.fileName,
      maxScore: submission.assignment.maxScore,
    });

    await saveEvaluation({
      schoolId: access.schoolId,
      assignmentSubmissionId: submissionId,
      maxScore: submission.assignment.maxScore,
      model,
      suggestion,
    });

    await prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        score: suggestion.score,
        teacherFeedback: suggestion.feedback,
        gradePublished: false,
        gradedAt: new Date(),
        gradedBy: access.userId,
      },
    });

    revalidatePath(`/list/assignments/${submission.assignmentId}/submissions`);
    revalidatePath("/list/assignments");
    return {
      success: true,
      error: false,
      message: "AI evaluation saved and applied as a draft score.",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI evaluation failed.";
    await failEvaluation({
      schoolId: access.schoolId,
      assignmentSubmissionId: submissionId,
      maxScore: submission.assignment.maxScore,
      error: message,
    });
    revalidatePath(`/list/assignments/${submission.assignmentId}/submissions`);
    return { success: false, error: true, message };
  }
}

export async function approveAssignmentSubmissionAiEvaluation(
  evaluationId: number,
  score: number,
  feedback?: string,
): Promise<AiActionResult> {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) {
    return { success: false, error: true, message: access.message };
  }

  const evaluation = await prisma.aiEvaluation.findFirst({
    where: {
      id: evaluationId,
      schoolId: access.schoolId,
      assignmentSubmission: {
        assignment:
          access.role === "teacher"
            ? { OR: [{ teacherId: access.userId }, { lesson: { teacherId: access.userId } }] }
            : undefined,
      },
    },
    include: {
      assignmentSubmission: true,
    },
  });

  if (!evaluation?.assignmentSubmission) {
    return { success: false, error: true, message: "AI evaluation not found." };
  }

  if (!Number.isFinite(score) || score < 0 || score > evaluation.maxScore) {
    return {
      success: false,
      error: true,
      message: `Score must be between 0 and ${evaluation.maxScore}.`,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.assignmentSubmission.update({
      where: { id: evaluation.assignmentSubmissionId! },
      data: {
        score,
        teacherFeedback: feedback?.trim() || evaluation.feedback,
        gradePublished: false,
        gradedAt: new Date(),
        gradedBy: access.userId,
      },
    });

    await tx.aiEvaluation.update({
      where: { id: evaluationId },
      data: {
        status: AiEvaluationStatus.APPROVED,
        approvedScore: score,
        approvedFeedback: feedback?.trim() || evaluation.feedback,
        approvedBy: access.userId,
        approvedAt: new Date(),
        needsReview: false,
      },
    });
  });

  revalidatePath(
    `/list/assignments/${evaluation.assignmentSubmission.assignmentId}/submissions`,
  );
  revalidatePath("/list/assignments");
  return { success: true, error: false, message: "AI score approved." };
}
