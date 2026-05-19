import { enforceRouteAccess } from "@/lib/enforce-route-access";
import prisma from "@/lib/prisma";
import ExamWorkflowForm from "@/components/forms/ExamWorkflowForm";
import { getCurrentAcademicYearIdOrNull } from "@/lib/academicYears";
import NoCurrentAcademicYearMessage from "@/components/NoCurrentAcademicYearMessage";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";

export default async function CreateExamWorkflowPage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const { role, userId, schoolId } = await enforceRouteAccess("/list/exams");
  const resolvedSearchParams = await searchParams;
  const examIdParam = getQueryParam(resolvedSearchParams.examId);
  const examId = examIdParam ? Number.parseInt(examIdParam, 10) : NaN;

  const academicYearId = await getCurrentAcademicYearIdOrNull(schoolId);
  if (!academicYearId) {
    return <NoCurrentAcademicYearMessage />;
  }

  const subjects = await prisma.subject.findMany({
    where: {
      schoolId,
      ...(role === "teacher"
        ? {
            OR: [
              { teachers: { some: { id: userId } } },
              { lessons: { some: { teacherId: userId, academicYearId } } },
            ],
          }
        : {}),
    },
    select: { id: true, name: true },
  });

  const exam = Number.isNaN(examId)
    ? null
    : await prisma.exam.findFirst({
        where: {
          id: examId,
          schoolId,
          academicYearId,
          ...(role === "teacher" ? { lesson: { teacherId: userId } } : {}),
        },
        include: {
          questions: {
            orderBy: { order: "asc" },
          },
        },
      });

  const relatedExams = exam
    ? await prisma.exam.findMany({
        where: {
          title: exam.title,
          startTime: exam.startTime,
          endTime: exam.endTime,
          subjectId: exam.subjectId,
          academicYearId,
          schoolId,
          ...(role === "teacher" ? { lesson: { teacherId: userId } } : {}),
        },
        select: { classId: true },
      })
    : [];

  const classIds = Array.from(
    new Set(
      relatedExams
        .map((item) => item.classId)
        .filter((classId): classId is number => typeof classId === "number"),
    ),
  );

  const initialData = exam
    ? {
        title: exam.title,
        startTime: exam.startTime,
        endTime: exam.endTime,
        subjectId: exam.subjectId ?? undefined,
        classIds,
        enableTimer: exam.enableTimer,
        duration: exam.duration ?? undefined,
        enableNavigation: exam.enableNavigation,
        enableAutoSave: exam.enableAutoSave,
        autoSaveInterval: exam.autoSaveInterval,
        enableAutoSubmit: exam.enableAutoSubmit,
        questionsPerPage: exam.questionsPerPage,
        questions: exam.questions.map((question) => ({
          type: question.type,
          text: question.text,
          points: question.points,
          order: question.order,
          allowMultiple: question.allowMultiple,
          options: Array.isArray(question.options)
            ? (question.options as string[])
            : [],
          correctAnswer: question.correctAnswer ?? [],
        })),
      }
    : undefined;

  const classes = await prisma.class.findMany({
    where: {
      schoolId,
      ...(role === "teacher"
        ? {
            OR: [
              { teachers: { some: { id: userId } } },
              { lessons: { some: { teacherId: userId, academicYearId } } },
            ],
          }
        : {}),
    },
    select: { id: true, name: true },
  });

  const teacherLessons = (role === "teacher") ? await prisma.lesson.findMany({
    where: {
      teacherId: userId,
      academicYearId,
      schoolId,
    },
    select: { subjectId: true, classId: true },
  }) : null;

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-6 rounded-md">
      <h1 className="mb-6 font-bold text-gray-900 text-2xl">
        {exam ? "Update Exam Workflow" : "Create New Exam Workflow"}
      </h1>
      <ExamWorkflowForm
        subjects={subjects}
        classes={classes}
        teacherLessons={teacherLessons}
        mode={exam ? "update" : "create"}
        examId={exam?.id}
        initialData={initialData}
      />
    </div>
  );
}
