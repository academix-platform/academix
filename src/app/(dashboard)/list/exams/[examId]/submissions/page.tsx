import Table from "@/components/Table";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import prisma from "@/lib/prisma";
import { Submission, Student, SubmissionStatus } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import PublishGradesButton from "./PublishGradesButton";
import { autoSubmitExpiredSubmissions } from "@/lib/actions/examWorkflow.actions";

type SubmissionRow = Submission & {
  student: Pick<Student, "name" | "username">;
};

const getStatusBadge = (status: SubmissionStatus) => {
  switch (status) {
    case "IN_PROGRESS":
      return (
        <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-md text-xs font-medium">
          In Progress
        </span>
      );
    case "SUBMITTED":
      return (
        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-xs font-medium">
          Submitted
        </span>
      );
    case "GRADED":
      return (
        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-md text-xs font-medium">
          Graded
        </span>
      );
  }
};

const columns = [
  { header: "Student", accessor: "student", className: "p-4" },
  { header: "Status", accessor: "status", className: "p-4" },
  { header: "Score", accessor: "score", className: "hidden md:table-cell p-4" },
  { header: "Submitted At", accessor: "submittedAt", className: "hidden md:table-cell p-4" },
  { header: "Actions", accessor: "action", className: "p-4" },
];

const renderRow = (item: SubmissionRow, examId: number, maxScore: number) => (
  <tr
    key={item.id}
    className="hover:bg-academixPurpleLight even:bg-slate-50 border-gray-200 border-b text-sm"
  >
    {/* Student */}
    <td className="p-4">
      <div className="flex flex-col">
        <span className="font-medium">{item.student.name}</span>
        <span className="text-gray-400 text-xs">{item.student.username}</span>
      </div>
    </td>

    {/* Status */}
    <td className="p-4">{getStatusBadge(item.status)}</td>

    {/* Score */}
    <td className="hidden md:table-cell p-4 text-left">
      {item.totalScore !== null && item.totalScore !== undefined
        ? `${item.totalScore}/${maxScore}`
        : "—"}
    </td>

    {/* Submitted At */}
    <td className="hidden md:table-cell p-4 text-left">
      {item.submittedAt
        ? new Intl.DateTimeFormat("en-US", {
            dateStyle: "short",
            timeStyle: "short",
          }).format(item.submittedAt)
        : "—"}
    </td>

    {/* Actions */}
    <td className="p-4">
      {(item.status === "SUBMITTED" || item.status === "GRADED") && (
        <Link
          href={`/list/exams/${examId}/submissions/${item.id}`}
          className="px-3 py-1.5 bg-academixPurpleDark text-white text-xs
            rounded-md hover:opacity-90 transition"
        >
          {item.status === "GRADED" ? "View" : "Grade"}
        </Link>
      )}
    </td>
  </tr>
);

const ExamSubmissionsPage = async ({
  params,
}: {
  params: Promise<{ examId: string }>;
}) => {
  const { role, userId, schoolId } = await enforceRouteAccess(
    "/list/exams"
  );
  const { examId: examIdStr } = await params;

  if (role !== "admin" && role !== "teacher") redirect("/list/exams");

  const examId = parseInt(examIdStr);
  if (isNaN(examId)) redirect("/list/exams");

  // Check that the teacher owns the exam
  const exam = await prisma.exam.findFirst({
    where: {
      id: examId,
      schoolId,
      ...(role === "teacher"
        ? { lesson: { teacherId: userId } }
        : {}),
    },
    include: {
      subject: { select: { name: true } },
      class: { select: { name: true } },
      questions: { select: { points: true } },
    },
  });

  if (!exam) redirect("/list/exams");
  const maxScore = exam.questions.reduce((sum, q) => sum + q.points, 0);

  // Auto-submit expired submissions before rendering
  await autoSubmitExpiredSubmissions(examId).catch(() => {});

  // Find all exams in the same group (same title, times, subject, school, academic year)
  const groupExams = await prisma.exam.findMany({
    where: {
      title: exam.title,
      startTime: exam.startTime,
      endTime: exam.endTime,
      subjectId: exam.subjectId,
      schoolId,
      academicYearId: exam.academicYearId,
    },
    select: { id: true },
  });
  const examIds = groupExams.map((e) => e.id);

  const submissions = await prisma.submission.findMany({
    where: { examId: { in: examIds }, schoolId },
    include: {
      student: { select: { name: true, username: true } },
    },
    orderBy: { submittedAt: "desc" },
  });

  const submitted = submissions.filter((s) => s.status !== "IN_PROGRESS").length;
  const graded = submissions.filter((s) => s.status === "GRADED").length;
  const inProgress = submissions.filter((s) => s.status === "IN_PROGRESS").length;
  const published = submissions.filter((s) => s.gradePublished).length;
  const hasGradedSubmissions = graded > 0;
  const allGradedPublished =
    hasGradedSubmissions &&
    submissions
      .filter((s) => s.status === "GRADED")
      .every((s) => s.gradePublished);

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Link href="/list/exams" className="hover:text-gray-600">
              Exams
            </Link>
            <span>/</span>
            <span className="text-gray-700">{exam.title}</span>
          </div>
          <h1 className="font-semibold text-lg">Submissions</h1>
        </div>
        <PublishGradesButton
          examId={examId}
          disabled={!hasGradedSubmissions || allGradedPublished}
          allPublished={allGradedPublished}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-gray-50 rounded-md p-4 flex flex-col gap-1">
          <span className="text-gray-400 text-xs">Total</span>
          <span className="font-bold text-xl">{submissions.length}</span>
        </div>
        <div className="bg-blue-50 rounded-md p-4 flex flex-col gap-1">
          <span className="text-blue-400 text-xs">Submitted</span>
          <span className="font-bold text-xl text-blue-700">{submitted}</span>
        </div>
        <div className="bg-green-50 rounded-md p-4 flex flex-col gap-1">
          <span className="text-green-400 text-xs">Graded</span>
          <span className="font-bold text-xl text-green-700">{graded}</span>
        </div>
        <div className="bg-yellow-50 rounded-md p-4 flex flex-col gap-1">
          <span className="text-yellow-400 text-xs">In Progress</span>
          <span className="font-bold text-xl text-yellow-700">{inProgress}</span>
        </div>
        <div className="bg-emerald-50 rounded-md p-4 flex flex-col gap-1">
          <span className="text-emerald-500 text-xs">Published</span>
          <span className="font-bold text-xl text-emerald-700">{published}</span>
        </div>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        renderRow={(item) => renderRow(item as SubmissionRow, examId, maxScore)}
        data={submissions}
        emptyTitle="No submissions yet"
        emptyDescription="Students have not submitted this exam yet."
      />
    </div>
  );
};

export default ExamSubmissionsPage;
