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
import { DataPageHeader, DataPageToolbar } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { getLocale, getTranslations } from "next-intl/server";
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
  assignmentSubmissions?: {
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

const formatDateTime = (date: Date, locale: string = "ar") =>
  new Intl.DateTimeFormat(locale, {
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
    columns.push({
      header: th("teacher"),
      accessor: "teacher",
      className: "hidden md:table-cell",
    });
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
  locale: string = "ar",
) => {
  const mySubmission = item.assignmentSubmissions?.[0] ?? null;
  const canManage = role === "teacher" || role === "admin";

  return (
    <tr
      key={item.id}
      className="hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors text-xs md:text-sm"
    >
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
            {item.title}
          </span>
          {/* Mobile secondary info */}
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 md:hidden text-xs text-slate-500 dark:text-slate-400">
            {item.subject?.name && (
              <Badge variant="secondary" size="sm" className="text-[10px] py-0 px-1.5 font-normal">
                {item.subject.name}
              </Badge>
            )}
            {item.class?.name && (
              <span className="text-[11px] text-slate-500">
                {item.class.name}
              </span>
            )}
            <span className="text-[11px] text-slate-400">
              {formatDateTime(item.endDate, locale)}
            </span>
          </div>
        </div>
      </td>

      <td className="px-4 py-3">
        {item.subject?.name ? (
          <Badge variant="secondary" size="sm" className="font-normal">
            {item.subject.name}
          </Badge>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>

      {role !== "student" && (
        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">
          {item.class?.name ?? "—"}
        </td>
      )}

      {role !== "teacher" && (
        <td className="hidden md:table-cell px-4 py-3 text-slate-600 dark:text-slate-300">
          {item.teacher?.name ?? item.lesson?.teacher.name ?? "—"}
        </td>
      )}

      {role === "student" && (
        <td className="px-4 py-3">
          {mySubmission ? (
            <Badge
              variant={
                mySubmission.gradePublished
                  ? "primary"
                  : mySubmission.teacherFeedback
                    ? "info"
                    : "success"
              }
              size="sm"
            >
              {mySubmission.gradePublished
                ? assignmentsT("status.gradePublished")
                : mySubmission.teacherFeedback
                  ? assignmentsT("status.feedbackReady")
                  : assignmentsT("status.submitted")}
            </Badge>
          ) : (
            <Badge variant="secondary" size="sm">
              {assignmentsT("status.notSubmitted")}
            </Badge>
          )}
        </td>
      )}

      {role === "student" && (
        <td className="px-4 py-3">
          {mySubmission?.gradePublished && mySubmission.score !== null ? (
            <Badge variant="primary" size="sm" className="font-bold">
              {mySubmission.score}/{item.maxScore}
            </Badge>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </td>
      )}

      <td className="hidden md:table-cell px-4 py-3 text-slate-600 dark:text-slate-300 w-[180px] min-w-[180px]">
        {formatDateTime(item.endDate, locale)}
      </td>

      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Download button for student */}
          {role === "student" && item.fileUrl && (
            <a
              href={`/api/download/${item.id}?type=assignment`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition-colors text-xs font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              {assignmentsT("actions.download")}
            </a>
          )}

          {role === "student" && (
            <AssignmentSubmit
              key={mySubmission?.id ?? "no-submission"}
              assignmentId={item.id}
              assignmentTitle={item.title}
              maxScore={item.maxScore}
              endDate={item.endDate}
              allowLateSubmission={item.allowLateSubmission}
              existingSubmission={
                mySubmission
                  ? {
                      id: mySubmission.id,
                      fileUrl: mySubmission.fileUrl,
                      fileName: mySubmission.fileName,
                      createdAt: mySubmission.createdAt,
                      note: mySubmission.note,
                      teacherFeedback: mySubmission.teacherFeedback,
                      score: mySubmission.score,
                      gradePublished: mySubmission.gradePublished,
                    }
                  : null
              }
            />
          )}

          {canManage && (
            <Link
              href={`/list/assignments/${item.id}/submissions`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors text-xs font-medium"
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
  const locale = await getLocale();
  const { role, userId, schoolId } = await enforceRouteAccess(
    "/list/assignments",
  );

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
        assignmentSubmissions:
          role === "student" && userId
            ? {
                where: { studentId: userId },
                select: {
                  id: true,
                  fileUrl: true,
                  fileName: true,
                  createdAt: true,
                  note: true,
                  teacherFeedback: true,
                  score: true,
                  gradePublished: true,
                },
              }
            : false,
        _count: includeSubmissionsCount
          ? { select: { assignmentSubmissions: true } }
          : false,
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
            select: { id: true, name: true, gradeId: true },
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
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <DataPageHeader
        title={t("allAssignments")}
        count={count}
        actions={
          role === "admin" || role === "teacher" ? (
            <>
              {role === "admin" && (
                <ExportButton
                  href={`/api/admin/assignments/export?${exportQuery.toString()}`}
                />
              )}
              <FormContainer table="assignment" type="create" />
            </>
          ) : undefined
        }
      />

      <DataPageToolbar
        search={<TableSearch />}
        filters={
          role === "admin" ? (
            <>
              <GradeFilter grades={grades} />
              <ClassFilter classes={classes} />
            </>
          ) : undefined
        }
        actions={<FilterSortActions sortKey="sort" />}
      />

      <Table
        columns={getColumns(role, th)}
        renderRow={(item) => renderRow(item, role, assignmentsT, locale)}
        data={data}
        emptyTitle={assignmentsT("empty.title")}
        emptyDescription={assignmentsT("empty.description")}
      />

      <Pagination page={p} count={count} />
    </div>
  );
};

export default AssignmentListPage;
