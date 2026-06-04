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
  isFileConfig,
  EXAM_FILE_MAX_SIZE_MB,
} from "../formValidationSchemas";
import {
  deleteExamFileFromCloudinary,
  generateExamUploadSignature,
} from "../cloudinary";

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
    if (answer.isOverridden) continue;
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

type ExamAccess = {
  userId: string;
  role: string;
  schoolId: number;
};

const getExamClassAssignments = async (
  access: ExamAccess,
  academicYearId: number,
  subjectId: number,
  classIds: number[]
) => {
  const subject = await prisma.subject.findFirst({
    where: { id: subjectId, schoolId: access.schoolId },
    select: {
      id: true,
      gradeId: true,
      teachers: { select: { id: true } },
    },
  });

  if (!subject) {
    return {
      error: true as const,
      message: "Selected subject was not found.",
    };
  }

  const classes = await prisma.class.findMany({
    where: { id: { in: classIds }, schoolId: access.schoolId },
    select: {
      id: true,
      gradeId: true,
      teachers: { select: { id: true } },
    },
  });

  if (classes.length !== classIds.length) {
    return {
      error: true as const,
      message: "One or more selected classes were not found.",
    };
  }

  const lessons = await prisma.lesson.findMany({
    where: {
      academicYearId,
      schoolId: access.schoolId,
      subjectId,
      classId: { in: classIds },
      ...(access.role === "teacher" ? { teacherId: access.userId } : {}),
    },
    select: { id: true, classId: true, teacherId: true },
  });

  const lessonsByClass = new Map<number, (typeof lessons)[number]>();
  for (const lesson of lessons) {
    if (!lessonsByClass.has(lesson.classId)) {
      lessonsByClass.set(lesson.classId, lesson);
    }
  }

  const subjectTeacherIds = new Set(subject.teachers.map((teacher) => teacher.id));
  const assignments = [];

  for (const selectedClass of classes) {
    const lesson = lessonsByClass.get(selectedClass.id);
    const classTeacherIds = new Set(
      selectedClass.teachers.map((teacher) => teacher.id)
    );
    const sharedTeacherId =
      [...subjectTeacherIds].find((teacherId) => classTeacherIds.has(teacherId)) ??
      lesson?.teacherId ??
      null;

    if (!lesson && selectedClass.gradeId !== subject.gradeId) {
      return {
        error: true as const,
        message: "One or more classes do not match the selected subject grade.",
      };
    }

    if (access.role === "teacher") {
      const teacherHasSubjectGrade =
        subjectTeacherIds.has(access.userId) &&
        selectedClass.gradeId === subject.gradeId;
      const teacherHasClassSubject =
        subjectTeacherIds.has(access.userId) &&
        classTeacherIds.has(access.userId);
      const teacherHasLesson = lesson?.teacherId === access.userId;

      if (!teacherHasSubjectGrade && !teacherHasClassSubject && !teacherHasLesson) {
        return {
          error: true as const,
          message: "You are not assigned to teach this subject for one or more selected classes.",
        };
      }
    }

    assignments.push({
      classId: selectedClass.id,
      lessonId: lesson?.id ?? null,
      teacherId: access.role === "teacher" ? access.userId : sharedTeacherId,
    });
  }

  return { error: false as const, assignments };
};

const teacherExamAccessWhere = (teacherId: string) => ({
  OR: [{ teacherId }, { lesson: { teacherId } }],
});

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

    const assignmentResult = await getExamClassAssignments(
      access,
      academicYearId,
      data.subjectId,
      data.classIds
    );

    if (assignmentResult.error) {
      return {
        success: false,
        error: true,
        message: assignmentResult.message,
      };
    }

    await prisma.$transaction(
      assignmentResult.assignments.map((assignment) =>
        prisma.exam.create({
          data: {
            title: data.title,
            startTime: data.startTime,
            endTime: data.endTime,
            lessonId: assignment.lessonId,
            teacherId: assignment.teacherId,
            classId: assignment.classId,
            subjectId: data.subjectId,
            academicYearId,
            schoolId: access.schoolId,
            instructions: data.instructions,
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
                  options: q.type === "FILE"
                    ? (q.fileConfig ?? { allowedExtensions: [], minFileSizeMb: 0, maxFileSizeMb: EXAM_FILE_MAX_SIZE_MB, instructions: "" })
                    : (q.options ?? []),
                  correctAnswer: q.correctAnswer ?? [],
                  allowMultiple: q.allowMultiple,
                  textAnswer: q.textAnswer,
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
        ...(access.role === "teacher" ? teacherExamAccessWhere(access.userId) : {}),
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

    const assignmentResult = await getExamClassAssignments(
      access,
      academicYearId,
      data.subjectId,
      data.classIds
    );

    if (assignmentResult.error) {
      return {
        success: false,
        error: true,
        message: assignmentResult.message,
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
        ...(access.role === "teacher" ? teacherExamAccessWhere(access.userId) : {}),
      },
      select: { id: true, classId: true, teacherId: true },
    });

    const selectedAssignmentsByClass = new Map<
      number,
      (typeof assignmentResult.assignments)[number]
    >();
    for (const assignment of assignmentResult.assignments) {
      selectedAssignmentsByClass.set(assignment.classId, assignment);
    }

    const groupExamIds = groupExams.map((exam) => exam.id);
    const submissionCount = await prisma.submission.count({
      where: {
        examId: { in: groupExamIds },
        schoolId: access.schoolId,
      },
    });

    const examStarted = new Date() > existingExam.startTime;
    const isLocked = examStarted && submissionCount > 0;

    if (isLocked) {
      await prisma.$transaction(async (tx) => {
        for (const exam of groupExams) {
          await tx.exam.update({
            where: { id: exam.id },
            data: {
              title: data.title,
              startTime: data.startTime,
              endTime: data.endTime,
              instructions: data.instructions,
              enableTimer: data.enableTimer,
              duration: data.duration,
              enableNavigation: data.enableNavigation,
              enableAutoSave: data.enableAutoSave,
              autoSaveInterval: data.autoSaveInterval,
              enableAutoSubmit: data.enableAutoSubmit,
              questionsPerPage: data.questionsPerPage,
            },
          });
        }
      });

      return successResult(["/list/exams"]);
    }

    await prisma.$transaction(async (tx) => {
      for (const exam of groupExams) {
        if (exam.classId && !selectedAssignmentsByClass.has(exam.classId)) {
          await tx.question.deleteMany({ where: { examId: exam.id } });
          await tx.exam.delete({ where: { id: exam.id } });
        }
      }

      for (const [classId, assignment] of selectedAssignmentsByClass) {
        const existingClassExam = groupExams.find((exam) => exam.classId === classId);

        if (existingClassExam) {
          const teacherId =
            assignment.teacherId ?? existingClassExam.teacherId ?? null;

          await tx.exam.update({
            where: { id: existingClassExam.id },
            data: {
              title: data.title,
              startTime: data.startTime,
              endTime: data.endTime,
              lessonId: assignment.lessonId,
              teacherId,
              classId,
              subjectId: data.subjectId,
              academicYearId,
              schoolId: access.schoolId,
              instructions: data.instructions,
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
              options: q.type === "FILE"
                ? (q.fileConfig ?? { allowedExtensions: [], minFileSizeMb: 0, maxFileSizeMb: EXAM_FILE_MAX_SIZE_MB, instructions: "" })
                : (q.options ?? []),
              correctAnswer: q.correctAnswer ?? [],
              allowMultiple: q.allowMultiple,
              textAnswer: q.textAnswer,
              schoolId: access.schoolId,
            })),
          });
        } else {
          await tx.exam.create({
            data: {
              title: data.title,
              startTime: data.startTime,
              endTime: data.endTime,
              lessonId: assignment.lessonId,
              teacherId: assignment.teacherId,
              classId,
              subjectId: data.subjectId,
              academicYearId,
              schoolId: access.schoolId,
              instructions: data.instructions,
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
                    options: q.type === "FILE"
                      ? (q.fileConfig ?? { allowedExtensions: [], minFileSizeMb: 0, maxFileSizeMb: EXAM_FILE_MAX_SIZE_MB, instructions: "" })
                      : (q.options ?? []),
                    correctAnswer: q.correctAnswer ?? [],
                    allowMultiple: q.allowMultiple,
                    textAnswer: q.textAnswer,
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

    // Update currentPage and lastSyncedAt
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        ...(page > submission.currentPage ? { currentPage: page } : {}),
        lastSyncedAt: new Date(),
      },
    });

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
        fileUrl: data.fileUrl ?? undefined,
        filePublicId: data.filePublicId ?? undefined,
        fileOriginalName: data.fileOriginalName ?? undefined,
        fileMimeType: data.fileMimeType ?? undefined,
        fileSizeBytes: data.fileSizeBytes ?? undefined,
        savedAt: new Date(),
      },
      create: {
        submissionId: data.submissionId,
        questionId: data.questionId,
        schoolId: access.schoolId,
        textAnswer: normalizedTextAnswer,
        fileUrl: data.fileUrl ?? null,
        filePublicId: data.filePublicId ?? null,
        fileOriginalName: data.fileOriginalName ?? null,
        fileMimeType: data.fileMimeType ?? null,
        fileSizeBytes: data.fileSizeBytes ?? null,
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

    // Check that the teacher owns the exam or any exam in the group
    if (access.role === "teacher") {
      const exam = answer.submission.exam;
      const isAuthorized = await prisma.exam.findFirst({
        where: {
          title: exam.title,
          startTime: exam.startTime,
          endTime: exam.endTime,
          subjectId: exam.subjectId,
          schoolId: access.schoolId,
          academicYearId: exam.academicYearId,
          ...teacherExamAccessWhere(access.userId),
        },
        select: { id: true },
      });

      if (!isAuthorized) {
        return { success: false, error: true, message: "Not authorized." };
      }
    }

    // Ensure the score does not exceed the points value
    if (data.score > answer.question.points) {
      return {
        success: false,
        error: true,
        message: `Score cannot exceed ${answer.question.points} points.`,
      };
    }

    const isAutoGradedType =
      answer.question.type === "MCQ" ||
      answer.question.type === "TRUE_FALSE";

    await prisma.answer.update({
      where: { id: data.answerId },
      data: {
        score: data.score,
        ...(isAutoGradedType ? { isOverridden: true } : {}),
      },
    });

    // Mark as unpublished since the grade changed
    await prisma.submission.update({
      where: { id: answer.submissionId },
      data: { gradePublished: false },
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
    data: { totalScore, status: "GRADED", gradePublished: false },
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
      submission.exam.teacherId !== access.userId &&
      submission.exam.lesson?.teacherId !== access.userId
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

// ============================================================
// 11. approveAndFinalizeGrading
// ============================================================

export const approveAndFinalizeGrading = async (submissionId: number) => {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;

  try {
    const submission = await prisma.submission.findFirst({
      where: { id: submissionId, schoolId: access.schoolId },
      include: {
        exam: {
          include: { lesson: true },
        },
        answers: {
          include: { question: true },
        },
      },
    });

    if (!submission) {
      return { success: false, error: true, message: "Submission not found." };
    }

    // Check that the teacher owns the exam or any exam in the group
    if (access.role === "teacher") {
      const exam = submission.exam;
      const isAuthorized = await prisma.exam.findFirst({
        where: {
          title: exam.title,
          startTime: exam.startTime,
          endTime: exam.endTime,
          subjectId: exam.subjectId,
          schoolId: access.schoolId,
          academicYearId: exam.academicYearId,
          ...teacherExamAccessWhere(access.userId),
        },
        select: { id: true },
      });

      if (!isAuthorized) {
        return { success: false, error: true, message: "Not authorized." };
      }
    }

    // Checks for any TEXT or FILE answers where score is null
    const ungradedOpenEnded = submission.answers.filter(
      (a) =>
        (a.question.type === "TEXT" || a.question.type === "FILE") &&
        a.score === null
    );

    if (ungradedOpenEnded.length > 0) {
      return {
        success: false,
        warning: `There are ${ungradedOpenEnded.length} question(s) that haven't been graded yet.`,
      };
    }

    // Sums up all answer scores and updates Submission.totalScore and Submission.status to GRADED
    const totalScore = submission.answers.reduce(
      (sum, a) => sum + (a.score ?? 0),
      0
    );

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        totalScore,
        status: "GRADED",
        gradePublished: false,
      },
    });

    return successResult([`/list/exams/${submission.examId}/submissions`]);
  } catch (err) {
    return errorResult(err);
  }
};

// ============================================================
// 12. publishExamGrades
// ============================================================

export const publishExamGrades = async (examId: number) => {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;

  try {
    const exam = await prisma.exam.findFirst({
      where: {
        id: examId,
        schoolId: access.schoolId,
        ...(access.role === "teacher"
          ? teacherExamAccessWhere(access.userId)
          : {}),
      },
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        subjectId: true,
        academicYearId: true,
      },
    });

    if (!exam) {
      return { success: false, error: true, message: "Exam not found." };
    }

    const groupExams = await prisma.exam.findMany({
      where: {
        title: exam.title,
        startTime: exam.startTime,
        endTime: exam.endTime,
        subjectId: exam.subjectId,
        schoolId: access.schoolId,
        academicYearId: exam.academicYearId,
        ...(access.role === "teacher"
          ? teacherExamAccessWhere(access.userId)
          : {}),
      },
      select: { id: true },
    });

    const examIds = groupExams.map((item) => item.id);

    const gradedSubmissions = await prisma.submission.findMany({
      where: {
        examId: { in: examIds },
        schoolId: access.schoolId,
        status: "GRADED",
        totalScore: { not: null },
      },
      select: {
        examId: true,
        studentId: true,
        totalScore: true,
        exam: {
          select: {
            academicYearId: true,
          },
        },
      },
    });

    await prisma.$transaction(async (tx) => {
      for (const submission of gradedSubmissions) {
        if (submission.totalScore === null) continue;

        const existingResult = await tx.result.findFirst({
          where: {
            schoolId: access.schoolId,
            examId: submission.examId,
            studentId: submission.studentId,
            academicYearId: submission.exam.academicYearId,
          },
          select: { id: true },
        });

        const resultData = {
          score: Math.round(submission.totalScore),
          schoolId: access.schoolId,
          studentId: submission.studentId,
          examId: submission.examId,
          assignmentId: null,
          academicYearId: submission.exam.academicYearId,
        };

        if (existingResult) {
          await tx.result.update({
            where: { id: existingResult.id },
            data: resultData,
          });
        } else {
          await tx.result.create({
            data: resultData,
          });
        }
      }

      await tx.submission.updateMany({
        where: {
          examId: { in: examIds },
          schoolId: access.schoolId,
          status: "GRADED",
        },
        data: { gradePublished: true },
      });
    });

    return successResult([
      "/list/exams",
      "/list/results",
      `/list/exams/${examId}/submissions`,
    ]);
  } catch (err) {
    return errorResult(err);
  }
};

// ============================================================
// 13. deleteExamFile
// ============================================================

export const deleteExamFile = async (answerId: number) => {
  const access = await requireActionAccess(["student"]);
  if ("error" in access) return { success: false, error: "Unauthorized" };

  try {
    const answer = await prisma.answer.findUnique({
      where: { id: answerId },
      include: {
        submission: { select: { studentId: true, schoolId: true, status: true } },
      },
    });

    if (!answer) {
      return { success: false, error: "Answer not found." };
    }

    if (answer.submission.studentId !== access.userId) {
      return { success: false, error: "Not authorized." };
    }

    if (answer.submission.status !== "IN_PROGRESS") {
      return { success: false, error: "Exam already submitted." };
    }

    if (answer.filePublicId) {
      await deleteExamFileFromCloudinary(answer.filePublicId);
    }

    await prisma.answer.update({
      where: { id: answerId },
      data: {
        fileUrl: null,
        filePublicId: null,
        fileOriginalName: null,
        fileMimeType: null,
        fileSizeBytes: null,
        savedAt: new Date(),
      },
    });

    return { success: true };
  } catch (err) {
    console.error("[deleteExamFile]", err);
    return { success: false, error: "Something went wrong." };
  }
};

// ============================================================
// 14. deleteOldExamFileOnReplace
// ============================================================

export const deleteOldExamFileOnReplace = async (
  publicId: string,
  submissionId: number,
  questionId: number
) => {
  const access = await requireActionAccess(["student"]);
  if ("error" in access) return { success: false, error: "Unauthorized" };

  try {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: { studentId: true, status: true },
    });

    if (!submission) {
      return { success: false, error: "Submission not found." };
    }

    if (submission.studentId !== access.userId) {
      return { success: false, error: "Not authorized." };
    }

    if (submission.status !== "IN_PROGRESS") {
      return { success: false, error: "Exam already submitted." };
    }

    await deleteExamFileFromCloudinary(publicId);

    return { success: true };
  } catch (err) {
    console.error("[deleteOldExamFileOnReplace]", err);
    return { success: false, error: "Something went wrong." };
  }
};

// ============================================================
// 15. autoSubmitExpiredSubmissions
// ============================================================

export const autoSubmitExpiredSubmissions = async (examId: number) => {
  try {
    const now = new Date();

    const submissions = await prisma.submission.findMany({
      where: {
        examId,
        status: "IN_PROGRESS",
      },
      include: {
        exam: { select: { duration: true, endTime: true } },
        answers: { select: { textAnswer: true, fileUrl: true, id: true, filePublicId: true } },
      },
    });

    for (const submission of submissions) {
      const examEndsAt = new Date(
        submission.startedAt.getTime() +
        ((submission.exam.duration ?? 0) + (submission.extraTime ?? 0)) * 60000
      );

      if (now <= examEndsAt) continue;

      const hasContent = submission.answers.some(
        (a) => (a.textAnswer && a.textAnswer.trim().length > 0) || a.fileUrl
      );

      if (hasContent) {
        await prisma.$transaction(async (tx) => {
          await tx.answer.updateMany({
            where: { submissionId: submission.id, isDraft: true },
            data: { isDraft: false },
          });

          await tx.submission.update({
            where: { id: submission.id },
            data: {
              status: "SUBMITTED",
              submittedAt: now,
              autoSubmitted: true,
            },
          });
        });

        try {
          await autoGrade(submission.id);
        } catch {
          // Non-critical — grade what we can
        }
      } else {
        // Empty abandoned submission: clean up Cloudinary files
        for (const answer of submission.answers) {
          if (answer.filePublicId) {
            await deleteExamFileFromCloudinary(answer.filePublicId).catch(() => {});
          }
        }

        await prisma.answer.updateMany({
          where: { submissionId: submission.id },
          data: {
            fileUrl: null,
            filePublicId: null,
            fileOriginalName: null,
            fileMimeType: null,
            fileSizeBytes: null,
          },
        });
      }
    }
  } catch (err) {
    console.error("[autoSubmitExpiredSubmissions]", err);
    // Silently catch — must never throw (page must still render)
  }
};

// ============================================================
// 15. getExamUploadSignature (server action)
// ============================================================

export const getExamUploadSignature = async (
  examId: number,
  submissionId: number,
  questionId: number
) => {
  const access = await requireActionAccess(["student"]);
  if ("error" in access) return { error: "Unauthorized" };

  try {
    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        studentId: access.userId,
        schoolId: access.schoolId,
        status: "IN_PROGRESS",
      },
      include: { exam: true },
    });

    if (!submission) {
      return { error: "Submission not found or not in progress" };
    }

    if (submission.examId !== examId) {
      return { error: "Submission does not belong to this exam" };
    }

    if (new Date() > submission.exam.endTime) {
      return { error: "Exam time has expired" };
    }

    const question = await prisma.question.findFirst({
      where: { id: questionId, examId, type: "FILE" },
    });

    if (!question) {
      return { error: "Question not found or not a FILE type" };
    }

    return generateExamUploadSignature(
      access.schoolId,
      examId,
      submissionId,
      questionId
    );
  } catch (err) {
    console.error("[getExamUploadSignature]", err);
    return { error: "Something went wrong." };
  }
};

export const publishAllGrades = publishExamGrades;

