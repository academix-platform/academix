import { redirect } from "next/navigation";
import { startExam } from "@/lib/actions/examWorkflow.actions";
import ExamClient from "@/components/exam/ExamClient";
import prisma from "@/lib/prisma";

export default async function TakeExamPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId: examIdStr } = await params;
  const examId = parseInt(examIdStr, 10);

  if (isNaN(examId)) {
    redirect("/list/exams");
  }

  const result = await startExam(examId);

  if ("error" in result && result.error) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="bg-red-50 text-red-700 p-6 rounded-lg max-w-md text-center border border-red-200">
          <h2 className="text-lg font-bold mb-2">Notice</h2>
          <p>{result.error}</p>
        </div>
      </div>
    );
  }

  if (!("submission" in result) || !result.submission) {
    return null;
  }

  // Count total questions to calculate total pages
  const totalQuestions = await prisma.question.count({ where: { examId } });
  const totalPages = Math.ceil(totalQuestions / result.exam.questionsPerPage);

  return (
    <ExamClient
      exam={result.exam}
      submission={result.submission}
      initialQuestions={result.questions}
      initialAnswers={result.savedAnswers}
      initialTimeRemaining={result.initialTimeRemaining}
      totalPages={totalPages}
    />
  );
}
