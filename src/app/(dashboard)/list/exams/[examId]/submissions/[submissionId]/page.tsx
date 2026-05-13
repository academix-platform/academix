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
  const exam = await prisma.exam.findFirst({
    where: {
      id: examId,
      schoolId,
      ...(role === "teacher"
        ? { lesson: { teacherId: userId } }
        : {}),
    },
    select: { id: true, title: true },
  });

  if (!exam) redirect("/list/exams");

  await syncAutoGrades(submissionId);

  // Load the submission with its answers
  const submission = await prisma.submission.findFirst({
    where: { id: submissionId, examId, schoolId },
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
      examTitle={exam.title}
      examId={examId}
    />
  );
};

export default GradeSubmissionPage;
