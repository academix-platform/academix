import Table from "@/components/Table";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { getQueryParam, PageSearchParams } from "@/lib/pageParams";
import prisma from "@/lib/prisma";
import type { AiEvaluation } from "@prisma/client";
import { Download, Eye } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import AssignmentSubmissionAiEvaluation from "./AssignmentSubmissionAiEvaluation";
import AssignmentSubmissionBulkActions from "./AssignmentSubmissionBulkActions";
import AssignmentSubmissionScoreForm from "./AssignmentSubmissionScoreForm";
import PublishAssignmentGradesButton from "./PublishAssignmentGradesButton";

type Props = {
  params: Promise<{ assignmentId: string }>;
  searchParams: PageSearchParams;
};

type SubmissionRow = {
  id: number;
  fileUrl: string;
  fileName: string;
  note: string | null;
  teacherFeedback: string | null;
  score: number | null;
  gradePublished: boolean;
  updatedAt: Date;
  createdAt: Date;
  aiEvaluation: AiEvaluation | null;
  student: {
    name: string;
    username: string;
    img: string | null;
  };
  assignment: {
    class: { name: string } | null;
  };
};

const columns = [
  { header: "Student", accessor: "student", className: "min-w-[190px] p-4" },
  { header: "Class", accessor: "class", className: "min-w-[120px] p-4" },
  { header: "File", accessor: "file", className: "hidden md:table-cell min-w-[180px] p-4" },
  { header: "Status", accessor: "status", className: "min-w-[120px] p-4" },
  { header: "Score", accessor: "score", className: "min-w-[140px] p-4" },
  { header: "Submitted", accessor: "submitted", className: "hidden md:table-cell p-4" },
  { header: "Actions", accessor: "actions", className: "min-w-[130px] p-4" },
];

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);

const browserPreviewExtensions = new Set([
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "txt",
]);

const getFileExtension = (fileName: string) =>
  fileName.split(".").pop()?.toLowerCase() ?? "";

const getPreviewHref = (submission: SubmissionRow) => {
  const extension = getFileExtension(submission.fileName);

  return browserPreviewExtensions.has(extension)
    ? `/api/preview/${submission.id}?type=submission`
    : null;
};

const getStatusBadge = (submission: SubmissionRow) => {
  if (submission.gradePublished) {
    return (
      <span className="rounded-md bg-academixPurpleLight px-2 py-1 text-xs font-medium text-academixPurpleDark">
        Published
      </span>
    );
  }

  if (submission.score !== null) {
    return (
      <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
        Draft Grade
      </span>
    );
  }

  return (
    <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
      Submitted
    </span>
  );
};

const renderRow = (item: SubmissionRow, maxScore: number) => {
  const isPdfSubmission = getFileExtension(item.fileName) === "pdf";

  return (
    <tr
      key={item.id}
      className="border-b border-gray-200 text-sm even:bg-slate-50 hover:bg-academixPurpleLight"
    >
      <td className="min-w-[190px] p-4">
        <div className="flex items-center gap-3">
          {item.student.img ? (
            <img
              src={item.student.img}
              alt={item.student.name}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-academixPurpleLight text-xs font-semibold text-academixPurpleDark">
              {item.student.name[0] ?? "S"}
            </div>
          )}
          <div className="flex flex-col">
            <span className="font-medium text-gray-800">{item.student.name}</span>
            <span className="text-xs text-gray-400">{item.student.username}</span>
          </div>
        </div>
      </td>
      <td className="min-w-[120px] p-4">{item.assignment.class?.name ?? "-"}</td>
      <td className="hidden max-w-[180px] truncate p-4 text-gray-500 md:table-cell">
        {item.fileName}
      </td>
      <td className="min-w-[120px] p-4">{getStatusBadge(item)}</td>
      <td className="min-w-[140px] p-4">
        <AssignmentSubmissionScoreForm
          submissionId={item.id}
          currentScore={item.score}
          maxScore={maxScore}
        />
      </td>
      <td className="hidden p-4 text-gray-500 md:table-cell">
        {formatDateTime(item.updatedAt)}
      </td>
      <td className="min-w-[320px] p-4">
        <div className="flex flex-wrap items-center gap-2">
          {getPreviewHref(item) ? (
            <a
              href={getPreviewHref(item) ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
            >
              <Eye className="h-3.5 w-3.5" />
              View
            </a>
          ) : (
            <span className="inline-flex items-center rounded-md bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-400">
              Preview unavailable
            </span>
          )}
          <a
            href={`/api/download/${item.id}?type=submission`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-md bg-academixPurpleLight px-3 py-1.5 text-xs font-medium text-academixPurpleDark transition hover:brightness-95"
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </a>
          <AssignmentSubmissionAiEvaluation
            submissionId={item.id}
            disabled={!isPdfSubmission}
          />
        </div>
      </td>
    </tr>
  );
};

const AssignmentSubmissionsPage = async ({ params, searchParams }: Props) => {
  const { role, userId, schoolId } = await enforceRouteAccess("/list/assignments");
  const { assignmentId: assignmentIdRaw } = await params;
  const resolvedSearchParams = await searchParams;

  if (role !== "admin" && role !== "teacher") redirect("/list/assignments");

  const assignmentId = Number.parseInt(assignmentIdRaw, 10);
  if (Number.isNaN(assignmentId)) redirect("/list/assignments");

  const classIdRaw = getQueryParam(resolvedSearchParams.classId);
  const search = getQueryParam(resolvedSearchParams.search)?.trim() ?? "";
  const parsedClassId = classIdRaw ? Number.parseInt(classIdRaw, 10) : null;
  const selectedClassId =
    parsedClassId && !Number.isNaN(parsedClassId) ? parsedClassId : null;

  const assignment = await prisma.assignment.findFirst({
    where: {
      id: assignmentId,
      schoolId,
      ...(role === "teacher"
        ? { OR: [{ teacherId: userId }, { lesson: { teacherId: userId } }] }
        : {}),
    },
    include: {
      subject: { select: { name: true } },
      class: { select: { id: true, name: true } },
    },
  });

  if (!assignment) redirect("/list/assignments");

  const groupAssignments = await prisma.assignment.findMany({
    where: {
      title: assignment.title,
      startDate: assignment.startDate,
      endDate: assignment.endDate,
      subjectId: assignment.subjectId,
      schoolId,
      academicYearId: assignment.academicYearId,
      ...(role === "teacher"
        ? { OR: [{ teacherId: userId }, { lesson: { teacherId: userId } }] }
        : {}),
    },
    include: {
      class: { select: { id: true, name: true } },
    },
    orderBy: { class: { name: "asc" } },
  });

  const assignmentIds = groupAssignments.map((item) => item.id);
  const classOptions = groupAssignments
    .map((item) => item.class)
    .filter((item): item is { id: number; name: string } => Boolean(item));

  const submissions = await prisma.assignmentSubmission.findMany({
    where: {
      assignmentId: { in: assignmentIds },
      schoolId,
      ...(selectedClassId ? { assignment: { classId: selectedClassId } } : {}),
      ...(search
        ? {
            student: {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { username: { contains: search, mode: "insensitive" } },
              ],
            },
          }
        : {}),
    },
    include: {
      student: { select: { name: true, username: true, img: true } },
      assignment: { select: { class: { select: { name: true } } } },
      aiEvaluation: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  const submitted = submissions.length;
  const graded = submissions.filter((submission) => submission.score !== null).length;
  const published = submissions.filter((submission) => submission.gradePublished).length;
  const draftGrades = submissions.filter(
    (submission) => submission.score !== null && !submission.gradePublished,
  ).length;
  const allPublished = graded > 0 && published === graded;

  return (
    <div className="m-4 mt-0 flex-1 rounded-md bg-white p-4">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm text-gray-400">
            <Link href="/list/assignments" className="hover:text-gray-600">
              Assignments
            </Link>
            <span>/</span>
            <span className="text-gray-700">{assignment.title}</span>
          </div>
          <h1 className="text-lg font-semibold">Assignment Submissions</h1>
          <p className="mt-1 text-sm text-gray-400">
            {assignment.subject?.name ?? "No subject"} - {assignment.maxScore} marks
          </p>
        </div>
        <PublishAssignmentGradesButton
          assignmentId={assignmentId}
          disabled={graded === 0 || draftGrades === 0}
          allPublished={allPublished}
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-md bg-gray-50 p-4">
          <span className="text-xs text-gray-400">Visible Submissions</span>
          <p className="text-xl font-bold">{submitted}</p>
        </div>
        <div className="rounded-md bg-green-50 p-4">
          <span className="text-xs text-green-500">Graded</span>
          <p className="text-xl font-bold text-green-700">{graded}</p>
        </div>
        <div className="rounded-md bg-amber-50 p-4">
          <span className="text-xs text-amber-500">Draft Grades</span>
          <p className="text-xl font-bold text-amber-700">{draftGrades}</p>
        </div>
        <div className="rounded-md bg-academixPurpleLight p-4">
          <span className="text-xs text-academixPurpleDark">Published</span>
          <p className="text-xl font-bold text-academixPurpleDark">{published}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <form className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap xl:w-auto">
          <select
            name="classId"
            defaultValue={selectedClassId ?? ""}
            className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-academixPurpleDark sm:w-auto"
          >
            <option value="">All Classes</option>
            {classOptions.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>
          <input
            name="search"
            defaultValue={search}
            placeholder="Search student..."
            className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-academixPurpleDark sm:w-[220px]"
          />
          <button
            type="submit"
            className="h-10 rounded-md bg-academixPurpleDark px-4 text-sm font-medium text-white transition hover:brightness-90"
          >
            Apply
          </button>
          {(selectedClassId || search) && (
            <Link
              href={`/list/assignments/${assignmentId}/submissions`}
              className="h-10 rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              Clear
            </Link>
          )}
        </form>

        <AssignmentSubmissionBulkActions
          assignmentId={assignmentId}
          maxScore={assignment.maxScore}
          classId={selectedClassId}
          search={search}
          disabled={submitted === 0}
        />
      </div>

      <div className="w-full overflow-x-auto">
        <div className="min-w-[980px]">
          <Table
            columns={columns}
            renderRow={(item) => renderRow(item as SubmissionRow, assignment.maxScore)}
            data={submissions}
            emptyTitle="No submissions found"
            emptyDescription="No student submissions match the current filters."
          />
        </div>
      </div>
    </div>
  );
};

export default AssignmentSubmissionsPage;
