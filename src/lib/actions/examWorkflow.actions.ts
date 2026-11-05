"use server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "../prisma";
import { normalizeStoredAnswer } from "../examAnswerUtils";
import {
  requireActionAccess,
  getRequiredAcademicYearId,
  successResult,
  errorResult,
  CurrentState,
} from "./helpers";
import {
  createExamWorkflowSchema,
  saveAnswerSchema,
  gradeAnswerSchema,
  extendTimeSchema,
  isFileConfig,
  CreateExamWorkflowSchema,
  SaveAnswerSchema,
  GradeAnswerSchema,
  ExtendTimeSchema,
} from "../formValidationSchemas";
import {
  deleteExamFileFromCloudinary,
  generateExamUploadSignature,
  getPrivateExamFile,
} from "../cloudinary";
import { notifyNewExam } from "./notification.actions";
import {
  getExamEndsAt,
  getTimeRemainingSeconds,
  isPastSubmitWindow,
} from "../exams/timing";
import {
  STUDENT_QUESTION_SELECT,
  buildExamSettingsData,
  buildQuestionsData,
} from "../exams/questions";
import {
  canManageExamGroup,
  examGroupWhere,
  teacherExamAccessWhere,
} from "../exams/group";
import {
  autoGrade,
  closeSubmission,
  finalizeGrade,
  unpublishExamGradeWrites,
} from "../exams/grading";
import {
  checkUploadedExamFile,
  getFileExtension,
  isExamFilePublicIdFor,
} from "../exams/files";

// ============================================================
// HELPERS
// ============================================================

// Server actions are public endpoints: every input is re-validated here even
// though the forms validate it too.
const invalidInput = (error: z.ZodError) => ({
  success: false,
  error: true,
  message: error.issues[0]?.message ?? "Invalid input.",
});

// Timed exams keep `lastSyncedAt` fresh through the timer stream; a long gap
// means the student was offline.
const MAX_SYNC_GAP_SECONDS = 60;

const validateSubmissionOwnership = (
  submissionId: number,
  studentId: string,
  schoolId: number
) =>
  prisma.submission.findFirst({
    where: { id: submissionId, studentId, schoolId },
    include: { exam: true },
  });

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

  const uniqueClassIds = [...new Set(classIds)];
  const classes = await prisma.class.findMany({
    where: { id: { in: uniqueClassIds }, schoolId: access.schoolId },
    select: {
      id: true,
      gradeId: true,
      teachers: { select: { id: true } },
    },
  });

  if (classes.length !== uniqueClassIds.length) {
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
      classId: { in: uniqueClassIds },
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

const getSelectedTeacherId = async (
  access: ExamAccess,
  data: CreateExamWorkflowSchema
) => {
  const selectedTeacherId =
    access.role === "admin" && data.teacherId?.trim()
      ? data.teacherId.trim()
      : null;

  if (!selectedTeacherId) return { teacherId: null };

  const teacherExists = await prisma.teacher.count({
    where: { id: selectedTeacherId, schoolId: access.schoolId },
  });

  return teacherExists
    ? { teacherId: selectedTeacherId }
    : { error: "Selected teacher was not found." };
};

const notifyCreatedExams = async (
  schoolId: number,
  examTitle: string,
  exams: { id: number; classId: number | null }[]
) => {
  for (const exam of exams) {
    if (exam.classId) {
      await notifyNewExam({
        schoolId,
        examId: exam.id,
        examTitle,
        classId: exam.classId,
      }).catch(() => {});
    }
  }
};

// ============================================================
// 1. createExamWorkflow
// ============================================================

export const createExamWorkflow = async (
  currentState: CurrentState,
  input: CreateExamWorkflowSchema
) => {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;

  const parsed = createExamWorkflowSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const data = parsed.data;

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

    const selectedTeacher = await getSelectedTeacherId(access, data);
    if ("error" in selectedTeacher) {
      return { success: false, error: true, message: selectedTeacher.error };
    }

    const groupId = randomUUID();
    const questionsData = buildQuestionsData(data.questions, access.schoolId);

    const createdExams = await prisma.$transaction(
      assignmentResult.assignments.map((assignment) =>
        prisma.exam.create({
          data: {
            ...buildExamSettingsData(data),
            groupId,
            lessonId: assignment.lessonId,
            teacherId: selectedTeacher.teacherId ?? assignment.teacherId,
            classId: assignment.classId,
            subjectId: data.subjectId,
            academicYearId,
            schoolId: access.schoolId,
            questions: { createMany: { data: questionsData } },
          },
          select: { id: true, classId: true },
        })
      )
    );

    await notifyCreatedExams(access.schoolId, data.title, createdExams);

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
  input: CreateExamWorkflowSchema
) => {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;

  const parsed = createExamWorkflowSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const data = parsed.data;

  try {
    const academicYearId = await getRequiredAcademicYearId(access.schoolId);

    const existingExam = await prisma.exam.findFirst({
      where: {
        id: examId,
        schoolId: access.schoolId,
        academicYearId,
        ...(access.role === "teacher" ? teacherExamAccessWhere(access.userId) : {}),
      },
      select: { id: true, groupId: true },
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

    const selectedTeacher = await getSelectedTeacherId(access, data);
    if ("error" in selectedTeacher) {
      return { success: false, error: true, message: selectedTeacher.error };
    }
    const selectedTeacherId = selectedTeacher.teacherId;

    const groupExams = await prisma.exam.findMany({
      where: { ...examGroupWhere(existingExam.groupId, access), academicYearId },
      select: { id: true, classId: true, teacherId: true },
    });

    const selectedAssignmentsByClass = new Map<
      number,
      (typeof assignmentResult.assignments)[number]
    >();
    for (const assignment of assignmentResult.assignments) {
      selectedAssignmentsByClass.set(assignment.classId, assignment);
    }

    const submissionCount = await prisma.submission.count({
      where: {
        examId: { in: groupExams.map((exam) => exam.id) },
        schoolId: access.schoolId,
      },
    });

    const settingsData = buildExamSettingsData(data);

    // Once any student has an attempt, questions and classes are frozen:
    // answers reference the questions, so only settings may change.
    if (submissionCount > 0) {
      // Say so instead of saving the settings and silently dropping the
      // class change.
      const currentClassIds = new Set(
        groupExams.flatMap((exam) => (exam.classId ? [exam.classId] : []))
      );
      const classesChanged =
        currentClassIds.size !== selectedAssignmentsByClass.size ||
        [...selectedAssignmentsByClass.keys()].some((id) => !currentClassIds.has(id));
      if (classesChanged) {
        return {
          success: false,
          error: true,
          message:
            "Students have already started this exam, so its classes can't change. Only the settings can be edited.",
        };
      }

      await prisma.$transaction(
        groupExams.map((exam) =>
          prisma.exam.update({
            where: { id: exam.id },
            data: {
              ...settingsData,
              teacherId: selectedTeacherId ?? exam.teacherId,
            },
          })
        )
      );

      return successResult(["/list/exams"]);
    }

    const questionsData = buildQuestionsData(data.questions, access.schoolId);
    const createdExamsToNotify: { id: number; classId: number | null }[] = [];

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
          await tx.exam.update({
            where: { id: existingClassExam.id },
            data: {
              ...settingsData,
              lessonId: assignment.lessonId,
              teacherId:
                selectedTeacherId ??
                existingClassExam.teacherId ??
                assignment.teacherId ??
                null,
              classId,
              subjectId: data.subjectId,
            },
          });

          await tx.question.deleteMany({
            where: { examId: existingClassExam.id },
          });

          await tx.question.createMany({
            data: questionsData.map((question) => ({
              ...question,
              examId: existingClassExam.id,
            })),
          });
        } else {
          const createdExam = await tx.exam.create({
            data: {
              ...settingsData,
              groupId: existingExam.groupId,
              lessonId: assignment.lessonId,
              teacherId: selectedTeacherId ?? assignment.teacherId,
              classId,
              subjectId: data.subjectId,
              academicYearId,
              schoolId: access.schoolId,
              questions: { createMany: { data: questionsData } },
            },
            select: { id: true, classId: true },
          });

          createdExamsToNotify.push(createdExam);
        }
      }
    });

    await notifyCreatedExams(access.schoolId, data.title, createdExamsToNotify);

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

    const submissionKey = {
      examId_studentId: { examId, studentId: access.userId },
    };

    const existing = await prisma.submission.findUnique({
      where: submissionKey,
      select: { status: true },
    });

    if (existing?.status === "SUBMITTED" || existing?.status === "GRADED") {
      return { error: "You have already submitted this exam." };
    }

    if (!existing && now > exam.endTime) {
      return { error: "Exam has already ended." };
    }

    // Upsert so a double click on "Start" can't hit the unique constraint.
    const submission = await prisma.submission.upsert({
      where: submissionKey,
      create: {
        examId,
        studentId: access.userId,
        schoolId: access.schoolId,
        lastSyncedAt: now,
      },
      update: {},
      include: { answers: true },
    });

    const examEndsAt = getExamEndsAt(submission, exam);

    const questions = await prisma.question.findMany({
      where: { examId },
      orderBy: { order: "asc" },
      skip: (submission.currentPage - 1) * exam.questionsPerPage,
      take: exam.questionsPerPage,
      select: STUDENT_QUESTION_SELECT,
    });

    return {
      submission,
      exam,
      questions,
      savedAnswers: submission.answers,
      examEndsAt,
      initialTimeRemaining: getTimeRemainingSeconds(examEndsAt),
      currentPage: submission.currentPage,
    };
  } catch (err) {
    console.error("[startExam]", err);
    return { error: "Something went wrong." };
  }
};

// ============================================================
// 3. getExamPage
// ============================================================

export const getExamPage = async (submissionId: number, page: number) => {
  const access = await requireActionAccess(["student"]);
  if ("error" in access) return { error: "Unauthorized" };

  if (!Number.isInteger(submissionId) || !Number.isInteger(page)) {
    return { error: "Invalid page number." };
  }

  try {
    const submission = await validateSubmissionOwnership(
      submissionId,
      access.userId,
      access.schoolId
    );

    if (!submission) return { error: "Submission not found." };
    if (submission.status !== "IN_PROGRESS")
      return { error: "Exam already submitted." };

    if (new Date() > getExamEndsAt(submission, submission.exam)) {
      return { error: "Exam time has expired." };
    }

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

    const questions = await prisma.question.findMany({
      where: { examId: submission.examId },
      orderBy: { order: "asc" },
      skip: (page - 1) * submission.exam.questionsPerPage,
      take: submission.exam.questionsPerPage,
      select: STUDENT_QUESTION_SELECT,
    });

    const questionIds = questions.map((q) => q.id);
    const savedAnswers = await prisma.answer.findMany({
      where: { submissionId, questionId: { in: questionIds } },
    });

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
    console.error("[getExamPage]", err);
    return { error: "Something went wrong." };
  }
};

// ============================================================
// 4. saveAnswer
// ============================================================

type FileFields = {
  fileUrl: string | null;
  filePublicId: string | null;
  fileOriginalName: string | null;
  fileMimeType: string | null;
  fileSizeBytes: number | null;
};

const EMPTY_FILE_FIELDS: FileFields = {
  fileUrl: null,
  filePublicId: null,
  fileOriginalName: null,
  fileMimeType: null,
  fileSizeBytes: null,
};

/**
 * Turns the file part of a save request into trusted fields. The browser only
 * names the uploaded file; its URL and size come from Cloudinary, and it must
 * live in this submission's folder and meet the question's file rules.
 */
const resolveFileFields = async (
  data: SaveAnswerSchema,
  submission: { id: number; examId: number; schoolId: number },
  question: { id: number; type: string; options: unknown }
): Promise<{ error: string } | { fields?: FileFields }> => {
  if (data.filePublicId === undefined) return {};
  if (data.filePublicId === null) return { fields: EMPTY_FILE_FIELDS };

  if (question.type !== "FILE") {
    return { error: "This question does not accept files." };
  }

  const publicId = data.filePublicId;
  const ids = {
    schoolId: submission.schoolId,
    examId: submission.examId,
    submissionId: submission.id,
    questionId: question.id,
  };

  if (!isExamFilePublicIdFor(publicId, ids)) {
    return { error: "Invalid file." };
  }

  const uploaded = await getPrivateExamFile(publicId);
  if (!uploaded) return { error: "Uploaded file was not found." };

  const originalName = data.fileOriginalName?.trim() || null;
  const extension =
    getFileExtension(publicId) || getFileExtension(originalName ?? "");

  const fileError = checkUploadedExamFile(
    { extension, bytes: uploaded.bytes },
    isFileConfig(question.options) ? question.options : null
  );
  if (fileError) {
    await deleteExamFileFromCloudinary(publicId);
    return { error: fileError };
  }

  return {
    fields: {
      fileUrl: uploaded.secureUrl,
      filePublicId: publicId,
      fileOriginalName: originalName ?? `file.${extension || "bin"}`,
      fileMimeType: `raw/${extension || "bin"}`,
      fileSizeBytes: uploaded.bytes,
    },
  };
};

export const saveAnswer = async (
  currentState: CurrentState,
  input: SaveAnswerSchema
) => {
  const access = await requireActionAccess(["student"]);
  if ("error" in access) return access;

  const parsed = saveAnswerSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const data = parsed.data;

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

    // The page flushes unsaved answers when time runs out and only then
    // submits, so the final saves land inside the same grace window as submit.
    if (isPastSubmitWindow(getExamEndsAt(submission, submission.exam))) {
      return { success: false, error: true, message: "Exam time has expired." };
    }

    // Anti-cheat: only timed exams run the heartbeat that keeps this fresh.
    if (submission.exam.enableTimer && submission.lastSyncedAt) {
      const gapSeconds =
        (Date.now() - submission.lastSyncedAt.getTime()) / 1000;
      if (gapSeconds > MAX_SYNC_GAP_SECONDS) {
        return {
          success: false,
          error: true,
          message: "Session appears to be offline. Please check your connection.",
        };
      }
    }

    const question = await prisma.question.findFirst({
      where: { id: data.questionId, examId: submission.examId },
      select: { id: true, type: true, options: true, allowMultiple: true },
    });

    if (!question) {
      return { success: false, error: true, message: "Invalid question." };
    }

    const fileResult = await resolveFileFields(data, submission, question);
    if ("error" in fileResult) {
      return { success: false, error: true, message: fileResult.error };
    }
    const fileFields = fileResult.fields;

    const answerKey = {
      submissionId_questionId: {
        submissionId: data.submissionId,
        questionId: data.questionId,
      },
    };

    const previousFile = fileFields
      ? await prisma.answer.findUnique({
          where: answerKey,
          select: { filePublicId: true },
        })
      : null;

    const textAnswer =
      data.textAnswer === undefined
        ? undefined
        : normalizeStoredAnswer(data.textAnswer, question.allowMultiple);
    const savedAt = new Date();

    await prisma.$transaction([
      prisma.answer.upsert({
        where: answerKey,
        update: { textAnswer, ...fileFields, savedAt },
        create: {
          submissionId: data.submissionId,
          questionId: data.questionId,
          schoolId: access.schoolId,
          textAnswer: textAnswer ?? null,
          ...(fileFields ?? EMPTY_FILE_FIELDS),
          isDraft: true,
          savedAt,
        },
      }),
      prisma.submission.update({
        where: { id: data.submissionId },
        data: { lastSyncedAt: savedAt },
      }),
    ]);

    // The file was replaced or removed: drop the old upload.
    const oldPublicId = previousFile?.filePublicId;
    if (oldPublicId && oldPublicId !== fileFields?.filePublicId) {
      await deleteExamFileFromCloudinary(oldPublicId);
    }

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
    // `closed`: the attempt is over either way, so the page can leave.
    if (submission.status !== "IN_PROGRESS")
      return { error: "Exam already submitted.", closed: true };

    if (isPastSubmitWindow(getExamEndsAt(submission, submission.exam))) {
      // Past the grace window; the auto-submit sweep closes the attempt.
      return { error: "Submission window has closed.", closed: true };
    }

    const closed = await closeSubmission(submission, { autoSubmitted: false });
    if (!closed) return { error: "Exam already submitted.", closed: true };

    // The attempt is safely submitted; a grading failure is retried when a
    // teacher opens the submission.
    await autoGrade(submissionId).catch((err) =>
      console.error("[submitExam] autoGrade", submissionId, err)
    );

    return { success: true };
  } catch (err) {
    console.error("[submitExam]", err);
    return { error: "Something went wrong." };
  }
};

// ============================================================
// 6. gradeAnswer
// ============================================================

export const gradeAnswer = async (
  currentState: CurrentState,
  input: GradeAnswerSchema
) => {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;

  const parsed = gradeAnswerSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const data = parsed.data;

  try {
    const answer = await prisma.answer.findFirst({
      where: { id: data.answerId, schoolId: access.schoolId },
      include: {
        question: { select: { type: true, points: true } },
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

    if (!answer) {
      return { success: false, error: true, message: "Answer not found." };
    }

    const exam = answer.submission.exam;
    if (!(await canManageExamGroup(exam.groupId, exam.schoolId, access))) {
      return { success: false, error: true, message: "Not authorized." };
    }

    if (answer.submission.status === "IN_PROGRESS") {
      return {
        success: false,
        error: true,
        message: "This exam is still in progress.",
      };
    }

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

    await prisma.$transaction([
      prisma.answer.update({
        where: { id: data.answerId },
        data: {
          score: data.score,
          ...(isAutoGradedType ? { isOverridden: true } : {}),
        },
      }),
      // The grade changed, so it has to be published again.
      ...unpublishExamGradeWrites(answer.submission),
    ]);

    await finalizeGrade(answer.submissionId);

    return successResult();
  } catch (err) {
    return errorResult(err);
  }
};

// ============================================================
// 7. extendTime
// ============================================================

export const extendTime = async (
  currentState: CurrentState,
  input: ExtendTimeSchema
) => {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;

  const parsed = extendTimeSchema.safeParse(input);
  if (!parsed.success) return invalidInput(parsed.error);
  const data = parsed.data;

  try {
    const submission = await prisma.submission.findFirst({
      where: {
        id: data.submissionId,
        schoolId: access.schoolId,
      },
      select: {
        status: true,
        extraTime: true,
        exam: { select: { groupId: true, schoolId: true } },
      },
    });

    if (!submission) {
      return { success: false, error: true, message: "Submission not found." };
    }

    const exam = submission.exam;
    if (!(await canManageExamGroup(exam.groupId, exam.schoolId, access))) {
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
        extraTime: (submission.extraTime ?? 0) + data.extraMinutes,
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
// 8. recordDisconnection
// ============================================================

const MAX_OFFLINE_SECONDS = 24 * 60 * 60;

export const recordDisconnection = async (
  submissionId: number,
  offlineSeconds: number,
  disconnectedAt: Date
) => {
  const access = await requireActionAccess(["student"]);
  if ("error" in access) return;

  if (
    !Number.isInteger(submissionId) ||
    !Number.isFinite(offlineSeconds) ||
    !(disconnectedAt instanceof Date) ||
    Number.isNaN(disconnectedAt.getTime())
  ) {
    return;
  }

  const seconds = Math.min(
    MAX_OFFLINE_SECONDS,
    Math.max(0, Math.floor(offlineSeconds))
  );

  try {
    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        studentId: access.userId,
        schoolId: access.schoolId,
        status: "IN_PROGRESS",
      },
      select: { totalOfflineTime: true },
    });
    if (!submission) return;

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        disconnectedAt,
        reconnectedAt: new Date(),
        totalOfflineTime: (submission.totalOfflineTime ?? 0) + seconds,
      },
    });
  } catch (err) {
    // Not critical for the exam itself.
    console.error("[recordDisconnection]", err);
  }
};

// ============================================================
// 9. approveAndFinalizeGrading
// ============================================================

export const approveAndFinalizeGrading = async (submissionId: number) => {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;

  if (!Number.isInteger(submissionId)) {
    return { success: false, error: true, message: "Submission not found." };
  }

  try {
    const submission = await prisma.submission.findFirst({
      where: { id: submissionId, schoolId: access.schoolId },
      select: {
        id: true,
        examId: true,
        studentId: true,
        schoolId: true,
        status: true,
        exam: { select: { groupId: true, schoolId: true } },
        answers: {
          select: { score: true, question: { select: { type: true } } },
        },
      },
    });

    if (!submission) {
      return { success: false, error: true, message: "Submission not found." };
    }

    const exam = submission.exam;
    if (!(await canManageExamGroup(exam.groupId, exam.schoolId, access))) {
      return { success: false, error: true, message: "Not authorized." };
    }

    if (submission.status === "IN_PROGRESS") {
      return {
        success: false,
        error: true,
        message: "This exam is still in progress.",
      };
    }

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

    const totalScore = submission.answers.reduce(
      (sum, a) => sum + (a.score ?? 0),
      0
    );

    await prisma.$transaction(
      unpublishExamGradeWrites(submission, { totalScore, status: "GRADED" })
    );

    return successResult([`/list/exams/${submission.examId}/submissions`]);
  } catch (err) {
    return errorResult(err);
  }
};

// ============================================================
// 10. publishExamGrades
// ============================================================

export const publishExamGrades = async (examId: number) => {
  const access = await requireActionAccess(["admin", "teacher"]);
  if ("error" in access) return access;

  if (!Number.isInteger(examId)) {
    return { success: false, error: true, message: "Exam not found." };
  }

  try {
    const exam = await prisma.exam.findFirst({
      where: {
        id: examId,
        schoolId: access.schoolId,
        ...(access.role === "teacher"
          ? teacherExamAccessWhere(access.userId)
          : {}),
      },
      select: { groupId: true },
    });

    if (!exam) {
      return { success: false, error: true, message: "Exam not found." };
    }

    const groupExams = await prisma.exam.findMany({
      where: examGroupWhere(exam.groupId, access),
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
        exam: { select: { academicYearId: true } },
      },
    });

    const existingResults = await prisma.result.findMany({
      where: {
        schoolId: access.schoolId,
        examId: { in: examIds },
        studentId: { in: gradedSubmissions.map((s) => s.studentId) },
      },
      select: { id: true, examId: true, studentId: true, academicYearId: true },
    });

    const resultKey = (r: { examId: number | null; studentId: string; academicYearId: number }) =>
      `${r.examId}:${r.studentId}:${r.academicYearId}`;
    const existingResultIds = new Map(
      existingResults.map((result) => [resultKey(result), result.id])
    );

    const writes = [];
    const newResults = [];

    for (const submission of gradedSubmissions) {
      if (submission.totalScore === null) continue;

      const resultData = {
        score: submission.totalScore,
        schoolId: access.schoolId,
        studentId: submission.studentId,
        examId: submission.examId,
        assignmentId: null,
        academicYearId: submission.exam.academicYearId,
      };

      const existingId = existingResultIds.get(resultKey(resultData));
      if (existingId) {
        writes.push(
          prisma.result.update({ where: { id: existingId }, data: resultData })
        );
      } else {
        newResults.push(resultData);
      }
    }

    await prisma.$transaction([
      ...writes,
      prisma.result.createMany({ data: newResults }),
      prisma.submission.updateMany({
        where: {
          examId: { in: examIds },
          schoolId: access.schoolId,
          status: "GRADED",
        },
        data: { gradePublished: true },
      }),
    ]);

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
// 11. getExamUploadSignature
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

    if (new Date() > getExamEndsAt(submission, submission.exam)) {
      return { error: "Exam time has expired" };
    }

    const question = await prisma.question.findFirst({
      where: { id: questionId, examId, type: "FILE" },
      select: { id: true },
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
