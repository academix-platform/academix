import ExportButton from "@/components/ExportButton";
import FilterSortActions from "@/components/FilterSortActions";
import FormContainer from "@/components/FormContainer";
import NoCurrentAcademicYearMessage from "@/components/NoCurrentAcademicYearMessage";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { buildAssignmentQuery } from "@/lib/query-builders/assignment-query";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { UserRole } from "@/lib/utils";
import { Assignment, Class, Subject, Teacher } from "@prisma/client";
import type { PageSearchParams } from "@/lib/pageParams";
import { Download } from "lucide-react";
import AssignmentFileUpload from "@/components/AssignmentFileUpload";
import AssignmentSubmit from "@/components/AssignmentSubmit";
import SubmissionsModal from "@/components/SubmissionsModal";

type AssignmentList = Assignment & {
  subject: Pick<Subject, "name"> | null;
  class: Pick<Class, "name"> | null;
  lesson: { teacher: Pick<Teacher, "name"> };
  submissions?: {
    fileUrl: string;
    fileName: string;
    createdAt: Date;
    note: string | null;
  }[];
  _count?: { submissions: number };
};

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);

const getColumns = (role: UserRole | null) => {
  const columns: { header: string; accessor: string; className?: string }[] = [
    { header: "Title",   accessor: "title" },
    { header: "Subject", accessor: "subject" },
  ];

  if (role !== "student") {
    columns.push({ header: "Class", accessor: "class" });
  }

  if (role !== "teacher") {
    columns.push({ header: "Teacher", accessor: "teacher", className: "hidden md:table-cell" });
  }

  columns.push({
    header: "End Date",
    accessor: "endDate",
    className: "hidden md:table-cell min-w-[180px] w-[180px]",
  });

  columns.push({
    header: role === "admin" || role === "teacher" ? "Actions" : "",
    accessor: "action",
  });

  return columns;
};

const renderRow = (item: AssignmentList, role: UserRole | null) => {
  const mySubmission = item.submissions?.[0] ?? null;
  return (
    <tr
      key={item.id}
      className="hover:bg-academixPurpleLight even:bg-slate-50 border-gray-200 border-b text-sm"
    >
      <td className="p-4">{item.title}</td>
      <td className="flex items-center gap-4 p-4">{item.subject?.name ?? "-"}</td>
      {role !== "student" && <td>{item.class?.name ?? "-"}</td>}
      {role !== "teacher" && (
        <td className="hidden md:table-cell">{item.lesson.teacher.name}</td>
      )}
      <td className="hidden md:table-cell w-[180px] min-w-[180px]">
        {formatDateTime(item.endDate)}
      </td>
      <td>
        <div className="flex items-center gap-2 flex-wrap">
          {item.fileUrl && (
            <a
              href={item.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={item.fileName ?? true}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors text-xs font-medium"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          )}
          {role === "student" && (
            <AssignmentSubmit
              assignmentId={item.id}
              assignmentTitle={item.title}
              endDate={item.endDate}
              existingSubmission={mySubmission}
            />
          )}
          {role === "teacher" && (
            <AssignmentFileUpload
              assignmentId={item.id}
              assignmentTitle={item.title}
              currentFileUrl={item.fileUrl}
              currentFileName={item.fileName}
            />
          )}
          {role === "teacher" && (
            <SubmissionsModal
              assignmentId={item.id}
              assignmentTitle={item.title}
              totalStudents={item._count?.submissions ?? 0}
            />
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

  const [data, count] = await prisma.$transaction([
    prisma.assignment.findMany({
      where: query,
      include: {
        subject: { select: { name: true } },
        class:   { select: { name: true } },
        lesson:  { select: { teacher: { select: { name: true } } } },
        assignmentSubmissions: role === "student" && userId
          ? { where: { studentId: userId }, select: { fileUrl: true, fileName: true, createdAt: true, note: true } }
          : false,
        _count: role === "teacher" ? { select: { assignmentSubmissions: true } } : false,
      },
      orderBy,
      take: ITEM_PER_PAGE,
      skip: (p - 1) * ITEM_PER_PAGE,
    }),
    prisma.assignment.count({ where: query }),
  ]);

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="font-semibold text-lg">All Assignments</h1>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <TableSearch />
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
        columns={getColumns(role)}
        renderRow={(item) => renderRow(item, role)}
        data={data}
        emptyTitle="No assignments found"
        emptyDescription="Try changing your filters or search terms."
      />

      <Pagination page={p} count={count} />
    </div>
  );
};

export default AssignmentListPage;