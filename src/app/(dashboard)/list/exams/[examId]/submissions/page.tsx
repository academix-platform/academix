import Table from "@/components/Table";
import { autoSubmitExpiredSubmissions } from "@/lib/actions/examWorkflow.actions";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { getQueryParam, PageSearchParams } from "@/lib/pageParams";
import prisma from "@/lib/prisma";
import { Class, Submission, Student, SubmissionStatus } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import PublishGradesButton from "./PublishGradesButton";

import ExtendTimeButton from "./ExtendTimeButton";

type SubmissionRow = Submission & {
  student: Pick<Student, "name" | "username">;
  exam: { class: Pick<Class, "name"> | null };
};

const getStatusBadge = (status: SubmissionStatus, t: (key: string) => string) => {
  switch (status) {
    case "IN_PROGRESS":
      return (
        <span className="rounded-md bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-700">
          {t("status.inProgress")}
        </span>
      );
    case "SUBMITTED":
      return (
        <span className="rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
          {t("status.submitted")}
        </span>
      );
    case "GRADED":
      return (
        <span className="rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
          {t("status.graded")}
        </span>
      );
  }
};

const getColumns = (th: (key: string) => string) => [
  { header: th("student"), accessor: "student", className: "min-w-[190px] p-4" },
  { header: th("class"), accessor: "class", className: "min-w-[120px] p-4" },
  { header: th("status"), accessor: "status", className: "min-w-[120px] p-4" },
  { header: th("score"), accessor: "score", className: "min-w-[140px] p-4" },
  {
    header: th("submittedAt"),
    accessor: "submittedAt",
    className: "hidden md:table-cell p-4",
  },
  { header: th("actions"), accessor: "action", className: "min-w-[110px] p-4" },
];

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);

const renderRow = (
  item: SubmissionRow,
  examId: number,
  maxScore: number,
  t: (key: string) => string,
) => (
  <tr
    key={item.id}
    className="border-b border-gray-200 text-sm even:bg-slate-50 hover:bg-academixPurpleLight"
  >
    <td className="min-w-[190px] p-4">
      <div className="flex flex-col">
        <span className="font-medium">{item.student.name}</span>
        <span className="text-xs text-gray-400">{item.student.username}</span>
      </div>
    </td>
    <td className="min-w-[120px] p-4">{item.exam.class?.name ?? "-"}</td>
    <td className="min-w-[120px] p-4">{getStatusBadge(item.status, t)}</td>
    <td className="min-w-[140px] p-4 text-start">
      {item.totalScore !== null && item.totalScore !== undefined
        ? `${item.totalScore}/${maxScore}`
        : "-"}
    </td>
    <td className="hidden p-4 text-start text-gray-500 md:table-cell">
      {item.submittedAt ? formatDateTime(item.submittedAt) : "-"}
    </td>
    <td className="min-w-[110px] p-4">
      {(item.status === "SUBMITTED" || item.status === "GRADED") && (
        <Link
          href={`/list/exams/${examId}/submissions/${item.id}`}
          className="rounded-md bg-academixPurpleDark px-3 py-1.5 text-xs text-white transition hover:opacity-90"
        >
          {item.status === "GRADED" ? t("actions.view") : t("actions.grade")}
        </Link>
      )}
      {item.status === "IN_PROGRESS" && (
        <ExtendTimeButton submissionId={item.id} studentName={item.student.name} />
      )}
    </td>
  </tr>
);

const ExamSubmissionsPage = async ({
  params,
  searchParams,
}: {
  params: Promise<{ examId: string }>;
  searchParams: PageSearchParams;
}) => {
  const th = await getTranslations("tableHeaders");
  const filtersT = await getTranslations("filters");
  const actionsT = await getTranslations("actions");
  const examSubmissionsT = await getTranslations("examSubmissions");
  const { role, userId, schoolId } = await enforceRouteAccess("/list/exams");
  const { examId: examIdStr } = await params;
  const resolvedSearchParams = await searchParams;

  if (role !== "admin" && role !== "teacher") redirect("/list/exams");

  const examId = parseInt(examIdStr);
  if (isNaN(examId)) redirect("/list/exams");

  const classIdRaw = getQueryParam(resolvedSearchParams.classId);
  const search = getQueryParam(resolvedSearchParams.search)?.trim() ?? "";
  const parsedClassId = classIdRaw ? Number.parseInt(classIdRaw, 10) : null;
  const selectedClassId =
    parsedClassId && !Number.isNaN(parsedClassId) ? parsedClassId : null;

  const exam = await prisma.exam.findFirst({
    where: {
      id: examId,
      schoolId,
      ...(role === "teacher"
        ? { OR: [{ teacherId: userId }, { lesson: { teacherId: userId } }] }
        : {}),
    },
    include: {
      subject: { select: { name: true } },
      questions: { select: { points: true } },
    },
  });

  if (!exam) redirect("/list/exams");
  const maxScore = exam.questions.reduce((sum, q) => sum + q.points, 0);

  await autoSubmitExpiredSubmissions(examId).catch(() => {});

  const groupExams = await prisma.exam.findMany({
    where: {
      title: exam.title,
      startTime: exam.startTime,
      endTime: exam.endTime,
      subjectId: exam.subjectId,
      schoolId,
      academicYearId: exam.academicYearId,
      ...(role === "teacher"
        ? { OR: [{ teacherId: userId }, { lesson: { teacherId: userId } }] }
        : {}),
    },
    include: { class: { select: { id: true, name: true } } },
    orderBy: { class: { name: "asc" } },
  });

  const examIds = groupExams.map((e) => e.id);
  const classOptions = groupExams
    .map((item) => item.class)
    .filter((item): item is { id: number; name: string } => Boolean(item));

  const submissions = await prisma.submission.findMany({
    where: {
      examId: { in: examIds },
      schoolId,
      ...(selectedClassId ? { exam: { classId: selectedClassId } } : {}),
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
      student: { select: { name: true, username: true } },
      exam: { select: { class: { select: { name: true } } } },
    },
    orderBy: { submittedAt: "desc" },
  });

  const submitted = submissions.filter((s) => s.status !== "IN_PROGRESS").length;
  const graded = submissions.filter((s) => s.status === "GRADED").length;
  const inProgress = submissions.filter((s) => s.status === "IN_PROGRESS").length;
  const published = submissions.filter((s) => s.gradePublished).length;
  const draftGrades = submissions.filter(
    (s) => s.status === "GRADED" && !s.gradePublished,
  ).length;
  const hasGradedSubmissions = graded > 0;
  const allGradedPublished =
    hasGradedSubmissions &&
    submissions
      .filter((s) => s.status === "GRADED")
      .every((s) => s.gradePublished);

  return (
    <div className="m-4 mt-0 flex-1 rounded-md bg-white p-4">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-sm text-gray-400">
            <Link href="/list/exams" className="hover:text-gray-600">
              {examSubmissionsT("breadcrumb")}
            </Link>
            <span>/</span>
            <span className="text-gray-700">{exam.title}</span>
          </div>
          <h1 className="text-lg font-semibold">{examSubmissionsT("title")}</h1>
          <p className="mt-1 text-sm text-gray-400">
            {exam.subject?.name ?? examSubmissionsT("subjectFallback")} -{" "}
            {examSubmissionsT("marks", { count: maxScore })}
          </p>
        </div>
        <PublishGradesButton
          examId={examId}
          disabled={!hasGradedSubmissions || allGradedPublished}
          allPublished={allGradedPublished}
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="flex flex-col gap-1 rounded-md bg-gray-50 p-4">
          <span className="text-xs text-gray-400">
            {examSubmissionsT("stats.visible")}
          </span>
          <span className="text-xl font-bold">{submissions.length}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-md bg-blue-50 p-4">
          <span className="text-xs text-blue-400">
            {examSubmissionsT("stats.submitted")}
          </span>
          <span className="text-xl font-bold text-blue-700">{submitted}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-md bg-green-50 p-4">
          <span className="text-xs text-green-400">
            {examSubmissionsT("stats.graded")}
          </span>
          <span className="text-xl font-bold text-green-700">{graded}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-md bg-yellow-50 p-4">
          <span className="text-xs text-yellow-400">
            {examSubmissionsT("stats.inProgress")}
          </span>
          <span className="text-xl font-bold text-yellow-700">{inProgress}</span>
        </div>
        <div className="flex flex-col gap-1 rounded-md bg-emerald-50 p-4">
          <span className="text-xs text-emerald-500">
            {examSubmissionsT("stats.published")}
          </span>
          <span className="text-xl font-bold text-emerald-700">{published}</span>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <form className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap xl:w-auto">
          <select
            name="classId"
            defaultValue={selectedClassId ?? ""}
            className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-academixPurpleDark sm:w-auto"
          >
            <option value="">{filtersT("allClasses")}</option>
            {classOptions.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>
          <input
            name="search"
            defaultValue={search}
            placeholder={filtersT("searchStudent")}
            className="h-10 w-full rounded-md border border-gray-200 px-3 text-sm outline-none focus:border-academixPurpleDark sm:w-[220px]"
          />
          <button
            type="submit"
            className="h-10 rounded-md bg-academixPurpleDark px-4 text-sm font-medium text-white transition hover:brightness-90"
          >
            {actionsT("apply")}
          </button>
          {(selectedClassId || search) && (
            <Link
              href={`/list/exams/${examId}/submissions`}
              className="h-10 rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
            >
              {actionsT("clear")}
            </Link>
          )}
        </form>
      </div>

      <div className="w-full overflow-x-auto">
        <div className="min-w-[760px]">
          <Table
            columns={getColumns(th)}
            renderRow={(item) =>
              renderRow(item as SubmissionRow, examId, maxScore, examSubmissionsT)
            }
            data={submissions}
            emptyTitle={examSubmissionsT("empty.title")}
            emptyDescription={examSubmissionsT("empty.description")}
          />
        </div>
      </div>
    </div>
  );
};

export default ExamSubmissionsPage;
