"use server";
import { validateFileUrl } from "../storage";
import prisma from "../prisma";
import {
  requireActionAccess,
  getRequiredAcademicYearId,
  successResult,
  errorResult,
  CurrentState,
} from "./helpers";
import {
  CreateExamWorkflowSchema,
  SaveAnswerSchema,
  GradeAnswerSchema,
  ExtendTimeSchema,
} from "../formValidationSchemas";

// ============================================================
// HELPERS
// ============================================================

const getExamEndsAt = (submission: {
  startedAt: Date;
  extraTime: number | null;
  exam: { duration: number | null };
}) => {
  return new Date(
    submission.startedAt.getTime() +
    ((submission.exam.duration ?? 0) + (submission.extraTime ?? 0)) * 60000
  );
};

const validateSubmissionOwnership = async (
  submissionId: number,
  studentId: string,
  schoolId: number
) => {
  const submission = await prisma.submission.findFirst({
    where: { id: submissionId, studentId, schoolId },
    include: { exam: true },
  });

  if (!submission) return null;
  return submission;
};

// ============================================================
// 1. createExamWorkflow
// ============================================================

export const createExamWorkflow = async (
  currentState: CurrentState,
  data: CreateExamWorkflowSchema
) => {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;

  try {
    const academicYearId = await getRequiredAcademicYearId(access.schoolId);

    // تحقق من الـ lessons
    const lessons = await prisma.lesson.findMany({
      where: {
        academicYearId,
        schoolId: access.schoolId,
        subjectId: data.subjectId,
        classId: { in: data.classIds },
        ...(access.role === "teacher" ? { teacherId: access.userId } : {}),
      },
      select: { id: true, classId: true },
    });

    if (lessons.length === 0) {
      return {
        success: false,
        error: true,
        message: "No lessons found for the selected subject and classes.",
      };
    }

    const matchedClassIds = new Set(lessons.map((l) => l.classId));
    if (matchedClassIds.size !== data.classIds.length) {
      return {
        success: false,
        error: true,
        message: "One or more classes don't have a lesson for this subject.",
      };
    }

    // أنشئ الامتحان لكل كلاس مع الأسئلة
    await prisma.$transaction(
      lessons.map((lesson) =>
        prisma.exam.create({
          data: {
            title: data.title,
            startTime: data.startTime,
            endTime: data.endTime,
            lessonId: lesson.id,
            classId: lesson.classId,
            subjectId: data.subjectId,
            academicYearId,
            schoolId: access.schoolId,
            // Feature toggles
            enableTimer: data.enableTimer,
            duration: data.duration,
            enableNavigation: data.enableNavigation,
            enableAutoSave: data.enableAutoSave,
            autoSaveInterval: data.autoSaveInterval,
            enableAutoSubmit: data.enableAutoSubmit,
            questionsPerPage: data.questionsPerPage,
            // Questions
            questions: {
              createMany: {
                data: data.questions.map((q) => ({
                  text: q.text,
                  type: q.type,
                  points: q.points,
                  order: q.order,
                  options: q.options ?? [],
                  correctAnswer: q.correctAnswer ?? [],
                  allowMultiple: q.allowMultiple,
                  schoolId: access.schoolId,
                })),
              },
            },
          },
        })
      )
    );

    return successResult(["/list/exams"]);
  } catch (err) {
    return errorResult(err);
  }
};

// ============================================================
// 2. startExam
// ============================================================

export const startExam = async (examId: number) => {
  const access = await requireActionAccess(["student"]);
  if ("error" in access) return { error: "Unauthorized" };

  try {
    const exam = await prisma.exam.findFirst({
      where: {
        id: examId,
        schoolId: access.schoolId,
        class: {
          students: { some: { id: access.userId } },
        },
      },
    });

    if (!exam) return { error: "Exam not found or not accessible." };

    const now = new Date();
    if (now < exam.startTime) return { error: "Exam has not started yet." };
    if (now > exam.endTime) return { error: "Exam has already ended." };

    // ابحث عن submission موجودة أو أنشئ واحدة
    let submission = await prisma.submission.findUnique({
      where: {
        examId_studentId: { examId, studentId: access.userId },
      },
      include: { answers: true },
    });

    if (submission?.status === "SUBMITTED" || submission?.status === "GRADED") {
      return { error: "You have already submitted this exam." };
    }

    if (!submission) {
      submission = await prisma.submission.create({
        data: {
          examId,
          studentId: access.userId,
          schoolId: access.schoolId,
          lastSyncedAt: new Date(),
        },
        include: { answers: true },
      });
    }

    // احسب الوقت المتبقي
    const examEndsAt = getExamEndsAt({
      startedAt: submission.startedAt,
      extraTime: submission.extraTime,
      exam: { duration: exam.duration },
    });

    // أول صفحة من الأسئلة
    const questions = await prisma.question.findMany({
      where: { examId },
      orderBy: { order: "asc" },
      skip: (submission.currentPage - 1) * exam.questionsPerPage,
      take: exam.questionsPerPage,
    });

    return {
      submission,
      exam,
      questions,
      savedAnswers: submission.answers,
      examEndsAt,
      initialTimeRemaining: Math.max(
        0,
        Math.floor((examEndsAt.getTime() - Date.now()) / 1000)
      ),
      currentPage: submission.currentPage,
    };
  } catch (err) {
    return { error: "Something went wrong." };
  }
};

// ============================================================
// 3. getExamPage
// ============================================================

export const getExamPage = async (submissionId: number, page: number) => {
  const access = await requireActionAccess(["student"]);
  if ("error" in access) return { error: "Unauthorized" };

  try {
    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        studentId: access.userId,
        schoolId: access.schoolId,
      },
      include: { exam: true },
    });

    if (!submission) return { error: "Submission not found." };
    if (submission.status !== "IN_PROGRESS")
      return { error: "Exam already submitted." };

    // تحقق من الوقت
    const examEndsAt = getExamEndsAt(submission);
    if (new Date() > examEndsAt) return { error: "Exam time has expired." };

    // تحقق من الـ navigation
    if (!submission.exam.enableNavigation) {
      if (page < submission.currentPage)
        return { error: "Navigation to previous pages is not allowed." };
      if (page > submission.currentPage + 1)
        return { error: "Cannot skip pages." };
    }

    const totalQuestions = await prisma.question.count({
      where: { examId: submission.examId },
    });
    const totalPages = Math.ceil(
      totalQuestions / submission.exam.questionsPerPage
    );

    if (page < 1 || page > totalPages)
      return { error: "Invalid page number." };

    // جيب الأسئلة
    const questions = await prisma.question.findMany({
      where: { examId: submission.examId },
      orderBy: { order: "asc" },
      skip: (page - 1) * submission.exam.questionsPerPage,
      take: submission.exam.questionsPerPage,
    });

    // جيب الإجابات المحفوظة لهذي الأسئلة
    const questionIds = questions.map((q) => q.id);
    const savedAnswers = await prisma.answer.findMany({
      where: { submissionId, questionId: { in: questionIds } },
    });

    // حدّث currentPage
    if (page > submission.currentPage) {
      await prisma.submission.update({
        where: { id: submissionId },
        data: { currentPage: page },
      });
    }

    return {
      questions,
      savedAnswers,
      currentPage: page,
      totalPages,
      isLastPage: page === totalPages,
    };
  } catch (err) {
    return { error: "Something went wrong." };
  }
};

// ============================================================
// 4. saveAnswer
// ============================================================

export const saveAnswer = async (
  currentState: CurrentState,
  data: SaveAnswerSchema
) => {
  const access = await requireActionAccess(["student"]);
  if ("error" in access) return access;

  try {
    const submission = await validateSubmissionOwnership(
      data.submissionId,
      access.userId,
      access.schoolId
    );

    if (!submission) {
      return { success: false, error: true, message: "Submission not found." };
    }

    if (submission.status !== "IN_PROGRESS") {
      return { success: false, error: true, message: "Exam already submitted." };
    }

    // تحقق من الوقت
    const examEndsAt = getExamEndsAt(submission);
    if (new Date() > examEndsAt) {
      return { success: false, error: true, message: "Exam time has expired." };
    }

    // تحقق من lastSyncedAt — أمان ضد الغش
    if (submission.lastSyncedAt) {
      const gapSeconds =
        (new Date().getTime() - submission.lastSyncedAt.getTime()) / 1000;
      if (gapSeconds > 60) {
        return {
          success: false,
          error: true,
          message: "Session appears to be offline. Please check your connection.",
        };
      }
    }

    // تحقق من أن السؤال ينتمي لهذا الامتحان
    const question = await prisma.question.findFirst({
      where: { id: data.questionId, examId: submission.examId },
    });

    if (!question) {
      return { success: false, error: true, message: "Invalid question." };
    }

    if (data.fileUrl && !validateFileUrl(data.fileUrl)) {
      return { success: false, error: true, message: "Invalid file URL." };
    }

    // upsert الإجابة
    await prisma.answer.upsert({
      where: {
        submissionId_questionId: {
          submissionId: data.submissionId,
          questionId: data.questionId,
        },
      },
      update: {
        textAnswer: data.textAnswer,
        fileUrl: data.fileUrl,
        savedAt: new Date(), // السيرفر يحدد الوقت دائماً
      },
      create: {
        submissionId: data.submissionId,
        questionId: data.questionId,
        schoolId: access.schoolId,
        textAnswer: data.textAnswer,
        fileUrl: data.fileUrl,
        isDraft: true,
        savedAt: new Date(),
      },
    });

    // حدّث lastSyncedAt
    await prisma.submission.update({
      where: { id: data.submissionId },
      data: { lastSyncedAt: new Date() },
    });

    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};

// ============================================================
// 5. submitExam
// ============================================================

export const submitExam = async (submissionId: number) => {
  const access = await requireActionAccess(["student"]);
  if ("error" in access) return { error: "Unauthorized" };

  try {
    const submission = await validateSubmissionOwnership(
      submissionId,
      access.userId,
      access.schoolId
    );

    if (!submission) return { error: "Submission not found." };
    if (submission.status !== "IN_PROGRESS")
      return { error: "Exam already submitted." };

    // تحقق من الوقت مع grace period 30 ثانية
    const examEndsAt = getExamEndsAt(submission);
    const graceEndsAt = new Date(examEndsAt.getTime() + 30000);
    if (new Date() > graceEndsAt) {
      return { error: "Submission window has closed." };
    }

    // سلّم
    await prisma.$transaction(async (tx) => {
      await tx.answer.updateMany({
        where: { submissionId, isDraft: true },
        data: { isDraft: false },
      });

      await tx.submission.update({
        where: { id: submissionId },
        data: {
          status: "SUBMITTED",
          submittedAt: new Date(),
        },
      });
    });

    // تصحيح تلقائي
    await autoGrade(submissionId);

    return { success: true };
  } catch (err) {
    return { error: "Something went wrong." };
  }
};

// ============================================================
// 6. autoGrade
// ============================================================

export const autoGrade = async (submissionId: number) => {
  const answers = await prisma.answer.findMany({
    where: { submissionId },
    include: { question: true },
  });

  for (const answer of answers) {
    if (
      answer.question.type === "TRUE_FALSE" ||
      answer.question.type === "MCQ"
    ) {
      const studentAnswers = (answer.textAnswer ?? "")
        .split(",")
        .map((a) => a.trim())
        .sort();
      const correctAnswers = [...answer.question.correctAnswer].sort();
      const isCorrect =
        JSON.stringify(studentAnswers) === JSON.stringify(correctAnswers);

      await prisma.answer.update({
        where: { id: answer.id },
        data: { score: isCorrect ? answer.question.points : 0 },
      });
    }
    // TEXT و FILE → score يبقى null ينتظر المعلم
  }

  // احسب totalScore من اللي اتصحح
  const updatedAnswers = await prisma.answer.findMany({
    where: { submissionId },
  });

  const allGraded = updatedAnswers.every((a) => a.score !== null);
  const totalScore = updatedAnswers.reduce(
    (sum, a) => sum + (a.score ?? 0),
    0
  );

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      totalScore,
      status: allGraded ? "GRADED" : "SUBMITTED",
    },
  });
};

// ============================================================
// 7. gradeAnswer
// ============================================================

export const gradeAnswer = async (
  currentState: CurrentState,
  data: GradeAnswerSchema
) => {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;

  try {
    const answer = await prisma.answer.findFirst({
      where: { id: data.answerId },
      include: {
        question: true,
        submission: {
          include: {
            exam: {
              include: { lesson: true },
            },
          },
        },
      },
    });

    if (!answer) {
      return { success: false, error: true, message: "Answer not found." };
    }

    // تحقق أن المعلم صاحب الامتحان
    if (
      access.role === "teacher" &&
      answer.submission.exam.lesson.teacherId !== access.userId
    ) {
      return { success: false, error: true, message: "Not authorized." };
    }

    // تحقق أن الدرجة ما تتجاوز الـ points
    if (data.score > answer.question.points) {
      return {
        success: false,
        error: true,
        message: `Score cannot exceed ${answer.question.points} points.`,
      };
    }

    await prisma.answer.update({
      where: { id: data.answerId },
      data: { score: data.score },
    });

    // حاول تُنهي التصحيح لو كل الإجابات اتصححت
    await finalizeGrade(answer.submissionId);

    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};

// ============================================================
// 8. finalizeGrade
// ============================================================

export const finalizeGrade = async (submissionId: number) => {
  const answers = await prisma.answer.findMany({
    where: { submissionId },
  });

  const allGraded = answers.every((a) => a.score !== null);
  if (!allGraded) return; // ينتظر حتى كل الإجابات تتصحح

  const totalScore = answers.reduce((sum, a) => sum + (a.score ?? 0), 0);

  await prisma.submission.update({
    where: { id: submissionId },
    data: { totalScore, status: "GRADED" },
  });
};

// ============================================================
// 9. extendTime
// ============================================================

export const extendTime = async (
  currentState: CurrentState,
  data: ExtendTimeSchema
) => {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;

  try {
    const submission = await prisma.submission.findFirst({
      where: {
        id: data.submissionId,
        schoolId: access.schoolId,
      },
      include: {
        exam: { include: { lesson: true } },
      },
    });

    if (!submission) {
      return { success: false, error: true, message: "Submission not found." };
    }

    // تحقق أن المعلم صاحب الامتحان
    if (
      access.role === "teacher" &&
      submission.exam.lesson.teacherId !== access.userId
    ) {
      return { success: false, error: true, message: "Not authorized." };
    }

    if (submission.status !== "IN_PROGRESS") {
      return {
        success: false,
        error: true,
        message: "Cannot extend time for a completed exam.",
      };
    }

    await prisma.submission.update({
      where: { id: data.submissionId },
      data: {
        extraTime: { increment: data.extraMinutes },
        extendedBy: access.userId,
        extendedAt: new Date(),
      },
    });

    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};

// ============================================================
// 10. recordDisconnection
// ============================================================

export const recordDisconnection = async (
  submissionId: number,
  offlineSeconds: number,
  disconnectedAt: Date
) => {
  const access = await requireActionAccess(["student"]);
  if ("error" in access) return;

  try {
    await prisma.submission.update({
      where: {
        id: submissionId,
        studentId: access.userId,
      },
      data: {
        disconnectedAt,
        reconnectedAt: new Date(),
        totalOfflineTime: offlineSeconds,
      },
    });
  } catch {
    // نتجاهل الأخطاء — مش critical
  }
};
