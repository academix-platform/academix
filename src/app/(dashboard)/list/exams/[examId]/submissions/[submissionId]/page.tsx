import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { syncAutoGrades } from "@/lib/actions/examWorkflow.actions";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import GradeClient from "./GradeClient";

const GradeSubmissionPage = async ({
  params,
}: {
  params: Promise<{ examId: string; submissionId: string }>;
}) => {
  const { role, userId, schoolId } = await enforceRouteAccess("/list/exams");
  const { examId: examIdStr, submissionId: submissionIdStr } = await params;

  if (role !== "admin" && role !== "teacher") redirect("/list/exams");

  const examId = parseInt(examIdStr);
  const submissionId = parseInt(submissionIdStr);

  if (isNaN(examId) || isNaN(submissionId)) redirect("/list/exams");

  // Check that the teacher owns the exam
  const urlExam = await prisma.exam.findFirst({
    where: {
      id: examId,
      schoolId,
      ...(role === "teacher"
        ? { lesson: { teacherId: userId } }
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

  if (!urlExam) redirect("/list/exams");

  // Find all exams in the same group
  const groupExams = await prisma.exam.findMany({
    where: {
      title: urlExam.title,
      startTime: urlExam.startTime,
      endTime: urlExam.endTime,
      subjectId: urlExam.subjectId,
      schoolId,
      academicYearId: urlExam.academicYearId,
    },
    select: { id: true },
  });
  const allowedExamIds = groupExams.map((e) => e.id);

  await syncAutoGrades(submissionId);

  // Load the submission with its answers
  const submission = await prisma.submission.findFirst({
    where: {
      id: submissionId,
      examId: { in: allowedExamIds },
      schoolId,
    },
    include: {
      student: { select: { name: true, username: true } },
      answers: {
        include: {
          question: true,
        },
      },
    },
  });

  if (!submission) redirect(`/list/exams/${examId}/submissions`);

  if (submission.status === "IN_PROGRESS") {
    redirect(`/list/exams/${examId}/submissions`);
  }

  return (
    <GradeClient
      submission={submission}
      answers={submission.answers}
      examTitle={urlExam.title}
      examId={examId}
    />
  );
};

export default GradeSubmissionPage;
