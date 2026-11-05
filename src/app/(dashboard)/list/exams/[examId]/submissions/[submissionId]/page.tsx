import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { examGroupWhere, teacherExamAccessWhere } from "@/lib/exams/group";
import { syncAutoGrades } from "@/lib/exams/grading";
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
      ...(role === "teacher" ? teacherExamAccessWhere(userId) : {}),
    },
    select: { id: true, title: true, groupId: true },
  });

  if (!urlExam) redirect("/list/exams");

  // Find all exams in the same group
  const groupExams = await prisma.exam.findMany({
    where: examGroupWhere(urlExam.groupId, { userId, role, schoolId }),
    select: { id: true },
  });
  const allowedExamIds = groupExams.map((e) => e.id);

  // Authorise the submission before re-scoring it.
  const allowedSubmission = await prisma.submission.findFirst({
    where: { id: submissionId, examId: { in: allowedExamIds }, schoolId },
    select: { status: true },
  });

  if (!allowedSubmission || allowedSubmission.status === "IN_PROGRESS") {
    redirect(`/list/exams/${examId}/submissions`);
  }

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
          aiEvaluation: true,
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
