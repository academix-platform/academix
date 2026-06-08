// src/app/(dashboard)/list/assignments/page.tsx
import ExportButton from "@/components/ExportButton";
import FilterSortActions from "@/components/FilterSortActions";
import FormContainer from "@/components/FormContainer";
import ClassFilter from "@/components/ClassFilter";
import GradeFilter from "@/components/GradeFilter";
import NoCurrentAcademicYearMessage from "@/components/NoCurrentAcademicYearMessage";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { getTranslations } from "next-intl/server";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { buildAssignmentQuery } from "@/lib/query-builders/assignment-query";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { UserRole } from "@/lib/utils";
import { Assignment, Class, Subject, Teacher } from "@prisma/client";
import type { PageSearchParams } from "@/lib/pageParams";
import { Download, Users } from "lucide-react";
import Link from "next/link";
import AssignmentSubmit from "@/components/AssignmentSubmit";

type AssignmentList = Assignment & {
  subject: Pick<Subject, "name"> | null;
  class: Pick<Class, "name"> | null;
  teacher: Pick<Teacher, "name"> | null;
  lesson: { teacher: Pick<Teacher, "name"> } | null;
  assignmentSubmissions?: { // تم التغيير من submissions إلى assignmentSubmissions
    id: number;
    fileUrl: string;
    fileName: string;
    createdAt: Date;
    note: string | null;
    teacherFeedback: string | null;
    score: number | null;
    gradePublished: boolean;
  }[];
  _count?: { assignmentSubmissions: number };
};

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);

const getColumns = (role: UserRole | null, th: (key: string) => string) => {
  const columns: { header: string; accessor: string; className?: string }[] = [
    { header: th("title"), accessor: "title" },
    { header: th("subject"), accessor: "subject" },
  ];

  if (role !== "student") {
    columns.push({ header: th("class"), accessor: "class" });
  }

  if (role !== "teacher") {
    columns.push({ header: th("teacher"), accessor: "teacher", className: "hidden md:table-cell" });
  }

  if (role === "student") {
    columns.push({ header: th("submission"), accessor: "submission" });
    columns.push({ header: th("score"), accessor: "score" });
  }

  columns.push({
    header: th("endDate"),
    accessor: "endDate",
    className: "hidden md:table-cell min-w-[180px] w-[180px]",
  });

  columns.push({
    header: role === "admin" || role === "teacher" ? th("actions") : "",
    accessor: "action",
  });

  return columns;
};

const renderRow = (
  item: AssignmentList,
  role: UserRole | null,
  assignmentsT: (key: string) => string,
) => {
  // ✅ استخدام assignmentSubmissions بدلاً من submissions
  const mySubmission = item.assignmentSubmissions?.[0] ?? null;
  const canManage = role === "teacher" || role === "admin";

  return (
    <tr
      key={item.id}
      className="hover:bg-academixPurpleLight even:bg-slate-50 border-gray-200 border-b text-sm"
    >
      <td className="p-4">{item.title}</td>
      <td className="flex items-center gap-4 p-4">{item.subject?.name ?? "-"}</td>
      {role !== "student" && <td>{item.class?.name ?? "-"}</td>}
      {role !== "teacher" && (
        <td className="hidden md:table-cell">
          {item.teacher?.name ?? item.lesson?.teacher.name ?? "-"}
        </td>
      )}
      {role === "student" && (
        <td>
          {mySubmission ? (
            <span
              className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                mySubmission.gradePublished
                  ? "bg-academixPurpleLight text-academixPurpleDark"
                  : mySubmission.teacherFeedback
                    ? "bg-blue-50 text-blue-700"
                    : "bg-green-50 text-green-700"
              }`}
            >
              {mySubmission.gradePublished
                ? assignmentsT("status.gradePublished")
                : mySubmission.teacherFeedback
                  ? assignmentsT("status.feedbackReady")
                  : assignmentsT("status.submitted")}
            </span>
          ) : (
            <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-500">
              {assignmentsT("status.notSubmitted")}
            </span>
          )}
        </td>
      )}
      {role === "student" && (
        <td>
          {mySubmission?.gradePublished && mySubmission.score !== null
            ? `${mySubmission.score}/${item.maxScore}`
            : "-"}
        </td>
      )}
      <td className="hidden md:table-cell w-[180px] min-w-[180px]">
        {formatDateTime(item.endDate)}
      </td>
      <td>
        <div className="flex items-center gap-2 flex-wrap">
          {/* زر Download للطالب فقط (إن وجد ملف) */}
          {role === "student" && item.fileUrl && (
            <a
              href={`/api/download/${item.id}?type=assignment`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors text-xs font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              {assignmentsT("actions.download")}
            </a>
          )}
          {role === "student" && (
            <AssignmentSubmit
              key={mySubmission?.id ?? 'no-submission'}
              assignmentId={item.id}
              assignmentTitle={item.title}
              maxScore={item.maxScore}
              endDate={item.endDate}
              allowLateSubmission={item.allowLateSubmission} // ✅
              existingSubmission={mySubmission ? {
                id: mySubmission.id,
                fileUrl: mySubmission.fileUrl,
                fileName: mySubmission.fileName,
                createdAt: mySubmission.createdAt,
                note: mySubmission.note,
                teacherFeedback: mySubmission.teacherFeedback,
                score: mySubmission.score,
                gradePublished: mySubmission.gradePublished,
              } : null}
            />
          )}
          {canManage && (
            <Link
              href={`/list/assignments/${item.id}/submissions`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-academixPurpleLight text-academixPurpleDark hover:brightness-95 transition-colors text-xs font-medium"
            >
              <Users className="w-3.5 h-3.5" />
              {assignmentsT("actions.submissions")}
            </Link>
          )}
          {(role === "admin" || role === "teacher") && (
            <>
              <FormContainer table="assignment" type="update" data={item} />
              <FormContainer table="assignment" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

const AssignmentListPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const t = await getTranslations("pages");
  const th = await getTranslations("tableHeaders");
  const assignmentsT = await getTranslations("assignmentsPage");
  const { role, userId, schoolId } = await enforceRouteAccess("/list/assignments");

  const resolvedSearchParams = await searchParams;

  const {
    academicYearId,
    query,
    orderBy,
    page: p,
  } = await buildAssignmentQuery({
    searchParams,
    schoolId,
    role,
    userId,
  });

  if (!academicYearId || !query) {
    return <NoCurrentAcademicYearMessage />;
  }

  const exportQuery = new URLSearchParams(
    Object.entries(resolvedSearchParams).flatMap(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map((item) => [key, item]);
      }
      return value ? [[key, value]] : [];
    }),
  );

  const includeSubmissionsCount = role === "teacher" || role === "admin";

  const [data, count] = await prisma.$transaction([
    prisma.assignment.findMany({
      where: query,
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } },
        lesson: { select: { teacher: { select: { name: true } } } },
        teacher: { select: { name: true } },
        assignmentSubmissions: role === "student" && userId
          ? { where: { studentId: userId }, select: { id: true, fileUrl: true, fileName: true, createdAt: true, note: true, teacherFeedback: true, score: true, gradePublished: true } }
          : false,
        _count: includeSubmissionsCount ? { select: { assignmentSubmissions: true } } : false,
      },
      orderBy,
      take: ITEM_PER_PAGE,
      skip: (p - 1) * ITEM_PER_PAGE,
    }),
    prisma.assignment.count({ where: query }),
  ]);
  const [classes, grades] =
    role === "admin"
      ? await prisma.$transaction([
          prisma.class.findMany({
            where: { schoolId },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          }),
          prisma.grade.findMany({
            where: { schoolId },
            select: { id: true, level: true },
            orderBy: { level: "asc" },
          }),
        ])
      : [[], []];

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="font-semibold text-lg">{t("allAssignments")}</h1>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <TableSearch />
          {role === "admin" && (
            <>
              <GradeFilter grades={grades} />
              <ClassFilter classes={classes} />
            </>
          )}
          <div className="flex items-center self-end gap-2">
            <FilterSortActions sortKey="sort" />
            {(role === "admin" || role === "teacher") && (
              <>
                {role === "admin" && (
                  <ExportButton
                    href={`/api/admin/assignments/export?${exportQuery.toString()}`}
                  />
                )}
                <FormContainer table="assignment" type="create" />
              </>
            )}
          </div>
        </div>
      </div>

      <Table
        columns={getColumns(role, th)}
        renderRow={(item) => renderRow(item, role, assignmentsT)}
        data={data}
        emptyTitle={assignmentsT("empty.title")}
        emptyDescription={assignmentsT("empty.description")}
      />

      <Pagination page={p} count={count} />
    </div>
  );
};

export default AssignmentListPage;
