import "server-only";
import type { PrismaClient } from "@prisma/client";
import { ATTENDING_STUDENT_STATUSES } from "@/lib/attendanceRules";
import {
  ResultAccess,
  assessmentOwnerWhere,
  examMaxScore,
} from "@/lib/results/manualResult";

// Data for the whole-class results screen. Every query is scoped to the
// caller's school, and teachers only see assessments they own or teach.

export type AssessmentType = "exam" | "assignment";
export type AssessmentRef = { type: AssessmentType; id: number };

export type EntryAssessment = AssessmentRef & {
  title: string;
  className: string;
  maxScore: number;
};

export type ClassEntryRow = {
  studentId: string;
  name: string;
  existingScore: number | null;
};

type EntryDb = Pick<
  PrismaClient,
  "exam" | "assignment" | "student" | "result" | "submission" | "assignmentSubmission"
>;

/** Reads "exam:10" or "assignment:20" from the page URL. */
export const parseAssessmentParam = (param?: string | null): AssessmentRef | null => {
  const match = /^(exam|assignment):([1-9]\d{0,8})$/.exec(param ?? "");
  return match ? { type: match[1] as AssessmentType, id: Number(match[2]) } : null;
};

export const entryAssessmentWhere = (access: ResultAccess, academicYearId: number) => ({
  schoolId: access.schoolId,
  academicYearId,
  AND: [
    ...(access.role === "teacher" ? [assessmentOwnerWhere(access)] : []),
    // An assessment with no class has no name list to enter marks against.
    { OR: [{ classId: { not: null } }, { lesson: { isNot: null } }] },
  ],
});

export const buildClassEntryRows = (
  students: { id: string; name: string }[],
  onlineStudentIds: string[],
  existingResults: { studentId: string; score: number }[],
) => {
  // Online work is graded and published from its submissions page.
  const online = new Set(onlineStudentIds);
  const scores = new Map(existingResults.map((result) => [result.studentId, result.score]));

  return {
    rows: students
      .filter((student) => !online.has(student.id))
      .map((student) => ({
        studentId: student.id,
        name: student.name,
        existingScore: scores.get(student.id) ?? null,
      })),
    onlineCount: students.filter((student) => online.has(student.id)).length,
  };
};

const classSelect = {
  id: true,
  title: true,
  classId: true,
  class: { select: { name: true } },
  lesson: { select: { classId: true, class: { select: { name: true } } } },
} as const;

type AssessmentRow = {
  id: number;
  title: string;
  classId: number | null;
  class: { name: string } | null;
  lesson: { classId: number; class: { name: string } } | null;
};

const classOf = (row: AssessmentRow) => ({
  classId: row.classId ?? row.lesson?.classId ?? null,
  className: row.class?.name ?? row.lesson?.class.name ?? "",
});

export const loadEntryAssessments = async (
  db: EntryDb,
  access: ResultAccess,
  academicYearId: number,
): Promise<EntryAssessment[]> => {
  const where = entryAssessmentWhere(access, academicYearId);
  const [exams, assignments] = await Promise.all([
    db.exam.findMany({
      where,
      select: { ...classSelect, questions: { select: { points: true } } },
      orderBy: { startTime: "desc" },
    }),
    db.assignment.findMany({
      where,
      select: { ...classSelect, maxScore: true },
      orderBy: { startDate: "desc" },
    }),
  ]);

  return [
    ...exams.map((exam) => ({
      type: "exam" as const,
      id: exam.id,
      title: exam.title,
      className: classOf(exam).className,
      maxScore: examMaxScore(exam.questions),
    })),
    ...assignments.map((assignment) => ({
      type: "assignment" as const,
      id: assignment.id,
      title: assignment.title,
      className: classOf(assignment).className,
      maxScore: assignment.maxScore,
    })),
  ];
};

/** Returns null when the assessment doesn't exist or isn't the caller's. */
export const loadClassEntry = async (
  db: EntryDb,
  access: ResultAccess,
  ref: AssessmentRef,
  academicYearId: number,
) => {
  const where = { id: ref.id, ...entryAssessmentWhere(access, academicYearId) };
  const found =
    ref.type === "exam"
      ? await db.exam
          .findFirst({ where, select: { ...classSelect, questions: { select: { points: true } } } })
          .then((exam) => exam && { ...exam, maxScore: examMaxScore(exam.questions) })
      : await db.assignment.findFirst({ where, select: { ...classSelect, maxScore: true } });
  if (!found) return null;

  const { classId, className } = classOf(found);
  if (classId === null) return null;

  const assessmentRef = ref.type === "exam" ? { examId: ref.id } : { assignmentId: ref.id };
  const [students, online, existing] = await Promise.all([
    db.student.findMany({
      where: { schoolId: access.schoolId, classId, status: { in: [...ATTENDING_STUDENT_STATUSES] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    ref.type === "exam"
      ? db.submission.findMany({ where: { examId: ref.id }, select: { studentId: true } })
      : db.assignmentSubmission.findMany({ where: { assignmentId: ref.id }, select: { studentId: true } }),
    db.result.findMany({
      where: { schoolId: access.schoolId, ...assessmentRef },
      select: { studentId: true, score: true },
    }),
  ]);

  return {
    classId,
    assessment: {
      type: ref.type,
      id: ref.id,
      title: found.title,
      className,
      maxScore: found.maxScore,
    } satisfies EntryAssessment,
    ...buildClassEntryRows(
      students,
      online.map((submission) => submission.studentId),
      existing,
    ),
  };
};
