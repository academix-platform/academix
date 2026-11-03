import { Prisma } from "@prisma/client";
import {
  CreateExamWorkflowSchema,
  EXAM_FILE_MAX_SIZE_MB,
} from "../formValidationSchemas";

/**
 * The only question fields a student may receive while taking an exam.
 * Never add `correctAnswer` or `textAnswer` (the model answer) here.
 */
export const STUDENT_QUESTION_SELECT = {
  id: true,
  examId: true,
  text: true,
  type: true,
  points: true,
  order: true,
  options: true,
  allowMultiple: true,
} satisfies Prisma.QuestionSelect;

export type StudentQuestion = Prisma.QuestionGetPayload<{
  select: typeof STUDENT_QUESTION_SELECT;
}>;

const DEFAULT_FILE_CONFIG = {
  allowedExtensions: [],
  minFileSizeMb: 0,
  maxFileSizeMb: EXAM_FILE_MAX_SIZE_MB,
  instructions: "",
};

export const buildQuestionsData = (
  questions: CreateExamWorkflowSchema["questions"],
  schoolId: number,
) =>
  questions.map((q) => ({
    text: q.text,
    type: q.type,
    points: q.points,
    order: q.order,
    options:
      q.type === "FILE" ? (q.fileConfig ?? DEFAULT_FILE_CONFIG) : (q.options ?? []),
    correctAnswer: q.correctAnswer ?? [],
    allowMultiple: q.allowMultiple,
    textAnswer: q.textAnswer,
    schoolId,
  }));

export const buildExamSettingsData = (data: CreateExamWorkflowSchema) => ({
  title: data.title,
  startTime: data.startTime,
  endTime: data.endTime,
  instructions: data.instructions,
  enableTimer: data.enableTimer,
  duration: data.enableTimer ? data.duration : null,
  enableNavigation: data.enableNavigation,
  enableAutoSave: data.enableAutoSave,
  autoSaveInterval: data.autoSaveInterval,
  questionsPerPage: data.questionsPerPage,
});
