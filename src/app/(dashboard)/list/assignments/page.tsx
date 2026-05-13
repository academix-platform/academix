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

type AssignmentList = Assignment & {
  subject: Pick<Subject, "name"> | null;
  class: Pick<Class, "name"> | null;
  lesson: {
    teacher: Pick<Teacher, "name">;
  };
};

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);

const getColumns = (role: UserRole | null) => {
  const columns: { header: string; accessor: string; className?: string }[] = [
    { header: "Title", accessor: "title" },
    { header: "Subject", accessor: "subject" },
  ];

  if (role !== "student") {
    columns.push({ header: "Class", accessor: "class" });
  }

  if (role !== "teacher") {
    columns.push({
      header: "Teacher",
      accessor: "teacher",
      className: "hidden md:table-cell",
    });
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

const renderRow = (item: AssignmentList, role: UserRole | null) => (
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
      <div className="flex items-center gap-2">
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

const AssignmentListPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const { role, userId, schoolId } =
    await enforceRouteAccess("/list/assignments");

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
        class: { select: { name: true } },
        lesson: {
          select: {
            teacher: { select: { name: true } },
          },
        },
      },
      orderBy,
      take: ITEM_PER_PAGE,
      skip: (p - 1) * ITEM_PER_PAGE,
    }),
    prisma.assignment.count({
      where: query,
    }),
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
      />

      <Pagination page={p} count={count} />
    </div>
  );
};

export default AssignmentListPage;
