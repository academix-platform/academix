import ExportButton from "@/components/ExportButton";
import FilterSortActions from "@/components/FilterSortActions";
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { buildSubjectQuery } from "@/lib/query-builders/subject-query";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { UserRole } from "@/lib/utils";
import { Subject, Teacher } from "@prisma/client";
import type { PageSearchParams } from "@/lib/pageParams";
import Link from "next/link";

type SubjectList = Subject & {
  teachers: Teacher[];
  grade: { id: number; level: number } | null;
};

const getColumns = (role: UserRole | null) => [
  { header: "Subject Name", accessor: "name" },
  { header: "Grade",        accessor: "grade",    className: "hidden md:table-cell" },
  { header: "Teachers",     accessor: "teachers", className: "hidden md:table-cell" },
  { header: role === "admin" ? "Actions" : "", accessor: "action" },
];

const renderRow = (item: SubjectList, role: UserRole | null) => (
  <tr
    key={item.id}
    className="hover:bg-academixPurpleLight even:bg-slate-50 border-gray-200 border-b text-sm"
  >
    <td className="flex items-center gap-4 p-4">
      <Link
        href={`/list/subjects/${item.id}`}
        className="font-medium hover:text-purple-600 hover:underline transition-colors"
      >
        {item.name}
      </Link>
    </td>

    <td className="hidden md:table-cell">{item.grade?.level ?? "-"}</td>

    <td className="hidden md:table-cell">
      {item.teachers.map((teacher) => teacher.name).join(", ")}
    </td>

    <td>
      <div className="flex items-center gap-2">
        {role === "admin" && (
          <>
            <FormContainer table="subject" type="update" data={item} />
            <FormContainer table="subject" type="delete" id={item.id} />
          </>
        )}
      </div>
    </td>
  </tr>
);

const SubjectListPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const { role, userId, schoolId } = await enforceRouteAccess("/list/subjects");

  const {
    query,
    orderBy,
    page: p,
  } = await buildSubjectQuery({
    searchParams,
    schoolId,
    role,
    userId,
  });

  const resolvedSearchParams = await searchParams;

  const exportQuery = new URLSearchParams(
    Object.entries(resolvedSearchParams).flatMap(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map((item) => [key, item]);
      }
      return value ? [[key, value]] : [];
    }),
  );

  const [data, count] = await prisma.$transaction([
    prisma.subject.findMany({
      where: query,
      include: {
        teachers: true,
        grade: true,
      },
      orderBy,
      take: ITEM_PER_PAGE,
      skip: (p - 1) * ITEM_PER_PAGE,
    }),
    prisma.subject.count({ where: query }),
  ]);

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="font-semibold text-lg">All Subjects</h1>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <TableSearch />

          <div className="flex items-center self-end gap-2">
            <FilterSortActions sortKey="sort" />

            {role === "admin" && (
              <>
                <ExportButton
                  href={`/api/admin/subjects/export?${exportQuery.toString()}`}
                />
                <FormContainer table="subject" type="create" />
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

export default SubjectListPage;