"use server";
import { validateFileUrl } from "../storage";
import prisma from "../prisma";
import {
  getAutoGradeScore,
  normalizeStoredAnswer,
} from "../examAnswerUtils";
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

const applyAutoGrades = async (submissionId: number) => {
  const answers = await prisma.answer.findMany({
    where: { submissionId },
    include: { question: true },
  });

  for (const answer of answers) {
    if (
      answer.question.type === "TRUE_FALSE" ||
      answer.question.type === "MCQ"
    ) {
      const score = getAutoGradeScore(
        answer.textAnswer,
        answer.question.correctAnswer,
        answer.question.allowMultiple,
        answer.question.points
      );

      await prisma.answer.update({
        where: { id: answer.id },
        data: { score },
      });
    }
  }

  const updatedAnswers = await prisma.answer.findMany({
    where: { submissionId },
  });

  const totalScore = updatedAnswers.reduce(
    (sum, answer) => sum + (answer.score ?? 0),
    0
  );

  return { updatedAnswers, totalScore };
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

    // Verify the lessons
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

    // Create an exam for each class with its questions
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
// 1b. updateExamWorkflow
// ============================================================

export const updateExamWorkflow = async (
  currentState: CurrentState,
  examId: number,
  data: CreateExamWorkflowSchema
) => {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;

  try {
    const academicYearId = await getRequiredAcademicYearId(access.schoolId);

    const existingExam = await prisma.exam.findFirst({
      where: {
        id: examId,
        schoolId: access.schoolId,
        academicYearId,
        ...(access.role === "teacher" ? { lesson: { teacherId: access.userId } } : {}),
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        subjectId: true,
      },
    });

    if (!existingExam) {
      return {
        success: false,
        error: true,
        message: "The exam you are trying to update was not found.",
      };
    }

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

    const groupExams = await prisma.exam.findMany({
      where: {
        title: existingExam.title,
        startTime: existingExam.startTime,
        endTime: existingExam.endTime,
        academicYearId,
        schoolId: access.schoolId,
        subjectId: existingExam.subjectId,
        ...(access.role === "teacher" ? { lesson: { teacherId: access.userId } } : {}),
      },
      select: { id: true, classId: true },
    });

    const selectedLessonsByClass = new Map<number, { id: number; classId: number }>();
    for (const lesson of lessons) {
      selectedLessonsByClass.set(lesson.classId, lesson);
    }

    await prisma.$transaction(async (tx) => {
      for (const exam of groupExams) {
        if (exam.classId && !selectedLessonsByClass.has(exam.classId)) {
          await tx.question.deleteMany({ where: { examId: exam.id } });
          await tx.exam.delete({ where: { id: exam.id } });
        }
      }

      for (const [classId, lesson] of selectedLessonsByClass) {
        const existingClassExam = groupExams.find((exam) => exam.classId === classId);

        if (existingClassExam) {
          await tx.exam.update({
            where: { id: existingClassExam.id },
            data: {
              title: data.title,
              startTime: data.startTime,
              endTime: data.endTime,
              lessonId: lesson.id,
              classId,
              subjectId: data.subjectId,
              academicYearId,
              schoolId: access.schoolId,
              enableTimer: data.enableTimer,
              duration: data.duration,
              enableNavigation: data.enableNavigation,
              enableAutoSave: data.enableAutoSave,
              autoSaveInterval: data.autoSaveInterval,
              enableAutoSubmit: data.enableAutoSubmit,
              questionsPerPage: data.questionsPerPage,
            },
          });

          await tx.question.deleteMany({
            where: { examId: existingClassExam.id },
          });

          await tx.question.createMany({
            data: data.questions.map((q) => ({
              examId: existingClassExam.id,
              text: q.text,
              type: q.type,
              points: q.points,
              order: q.order,
              options: q.options ?? [],
              correctAnswer: q.correctAnswer ?? [],
              allowMultiple: q.allowMultiple,
              schoolId: access.schoolId,
            })),
          });
        } else {
          await tx.exam.create({
            data: {
              title: data.title,
              startTime: data.startTime,
              endTime: data.endTime,
              lessonId: lesson.id,
              classId,
              subjectId: data.subjectId,
              academicYearId,
              schoolId: access.schoolId,
              enableTimer: data.enableTimer,
              duration: data.duration,
              enableNavigation: data.enableNavigation,
              enableAutoSave: data.enableAutoSave,
              autoSaveInterval: data.autoSaveInterval,
              enableAutoSubmit: data.enableAutoSubmit,
              questionsPerPage: data.questionsPerPage,
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
          });
        }
      }
    });

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

    // Find an existing submission or create a new one
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

    // Calculate the remaining time
    const examEndsAt = getExamEndsAt({
      startedAt: submission.startedAt,
      extraTime: submission.extraTime,
      exam: { duration: exam.duration },
    });

    // Load the first page of questions
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

    // Check the exam time
    const examEndsAt = getExamEndsAt(submission);
    if (new Date() > examEndsAt) return { error: "Exam time has expired." };

    // Check navigation rules
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

    // Fetch the questions
    const questions = await prisma.question.findMany({
      where: { examId: submission.examId },
      orderBy: { order: "asc" },
      skip: (page - 1) * submission.exam.questionsPerPage,
      take: submission.exam.questionsPerPage,
    });

    // Fetch saved answers for these questions
    const questionIds = questions.map((q) => q.id);
    const savedAnswers = await prisma.answer.findMany({
      where: { submissionId, questionId: { in: questionIds } },
    });

    // Update currentPage
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

    // Check the exam time
    const examEndsAt = getExamEndsAt(submission);
    if (new Date() > examEndsAt) {
      return { success: false, error: true, message: "Exam time has expired." };
    }

    // Check lastSyncedAt - anti-cheat protection
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

    // Check that the question belongs to this exam
    const question = await prisma.question.findFirst({
      where: { id: data.questionId, examId: submission.examId },
    });

    if (!question) {
      return { success: false, error: true, message: "Invalid question." };
    }

    if (data.fileUrl && !validateFileUrl(data.fileUrl)) {
      return { success: false, error: true, message: "Invalid file URL." };
    }

    // Upsert the answer
    const normalizedTextAnswer = normalizeStoredAnswer(
      data.textAnswer ?? null,
      question.allowMultiple
    );

    await prisma.answer.upsert({
      where: {
        submissionId_questionId: {
          submissionId: data.submissionId,
          questionId: data.questionId,
        },
      },
      update: {
        textAnswer: normalizedTextAnswer,
        fileUrl: data.fileUrl,
        savedAt: new Date(), // The server always sets the time
      },
      create: {
        submissionId: data.submissionId,
        questionId: data.questionId,
        schoolId: access.schoolId,
        textAnswer: normalizedTextAnswer,
        fileUrl: data.fileUrl,
        isDraft: true,
        savedAt: new Date(),
      },
    });

    // Update lastSyncedAt
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

    // Check the time with a 30-second grace period
    const examEndsAt = getExamEndsAt(submission);
    const graceEndsAt = new Date(examEndsAt.getTime() + 30000);
    if (new Date() > graceEndsAt) {
      return { error: "Submission window has closed." };
    }

    // Submit
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

    // Run final grading
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
  const { updatedAnswers, totalScore } = await applyAutoGrades(submissionId);
  const allGraded = updatedAnswers.every((a) => a.score !== null);

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      totalScore,
      status: allGraded ? "GRADED" : "SUBMITTED",
    },
  });
};

export const syncAutoGrades = async (submissionId: number) => {
  const { totalScore } = await applyAutoGrades(submissionId);

  await prisma.submission.update({
    where: { id: submissionId },
    data: { totalScore },
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

    // Check that the teacher owns the exam
    if (
      access.role === "teacher" &&
      answer.submission.exam.lesson.teacherId !== access.userId
    ) {
      return { success: false, error: true, message: "Not authorized." };
    }

    // Ensure the score does not exceed the points value
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

    // Try to finalize grading if all answers are graded
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
  if (!allGraded) return; // Wait until all answers are graded

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

    // Check that the teacher owns the exam
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
    // Ignore errors - not critical
  }
};

