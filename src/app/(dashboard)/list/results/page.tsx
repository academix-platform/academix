import ExportButton from "@/components/ExportButton";
import FilterSortActions from "@/components/FilterSortActions";
import FormContainer from "@/components/FormContainer";
import NoCurrentAcademicYearMessage from "@/components/NoCurrentAcademicYearMessage";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { buildResultQuery } from "@/lib/query-builders/result-query";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { UserRole } from "@/lib/utils";
import { Assignment, Exam, Result, Student } from "@prisma/client";
import Image from "next/image";
import type { PageSearchParams } from "@/lib/pageParams";

type ResultList = Result & {
  student: Pick<Student, "name">;
  exam: Pick<Exam, "title"> | null;
  assignment: Pick<Assignment, "title"> | null;
};

const getColumns = (role: UserRole | null) => {
  const columns = [
    {
      header: "Student",
      accessor: "student",
    },
    {
      header: "Assessment",
      accessor: "assessment",
    },
    {
      header: "Score",
      accessor: "score",
      className: "hidden md:table-cell",
    },
  ];

  if (role === "admin" || role === "teacher") {
    columns.push({
      header: "Actions",
      accessor: "action",
    });
  }

  return columns;
};

const renderRow = (item: ResultList, role: UserRole | null) => (
  <tr
    key={item.id}
    className="hover:bg-academixPurpleLight even:bg-slate-50 border-gray-200 border-b text-sm"
  >
    <td className="flex items-center gap-4 p-4">
      <Image
        src="/noAvatar.png"
        alt=""
        width={40}
        height={40}
        className="hidden md:block rounded-full w-10 h-10 object-cover"
      />
      {item.student.name}
    </td>

    <td>{item.exam?.title || item.assignment?.title || "-"}</td>

    <td className="hidden md:table-cell">{item.score}</td>

    {(role === "admin" || role === "teacher") && (
      <td>
        <div className="flex items-center gap-2">
          <FormContainer table="result" type="update" data={item} />
          <FormContainer table="result" type="delete" id={item.id} />
        </div>
      </td>
    )}
  </tr>
);

const ResultListPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const { role, userId, schoolId } = await enforceRouteAccess("/list/results");

  const resolvedSearchParams = await searchParams;

  const {
    academicYearId,
    query,
    orderBy,
    page: p,
  } = await buildResultQuery({
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
    prisma.result.findMany({
      where: query,
      include: {
        student: {
          select: {
            name: true,
          },
        },
        exam: {
          select: {
            title: true,
          },
        },
        assignment: {
          select: {
            title: true,
          },
        },
      },
      orderBy,
      take: ITEM_PER_PAGE,
      skip: (p - 1) * ITEM_PER_PAGE,
    }),
    prisma.result.count({
      where: query,
    }),
  ]);

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="font-semibold text-lg">All Results</h1>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <TableSearch />

          <div className="flex items-center self-end gap-2">
            <FilterSortActions sortKey="sort" />

            {(role === "admin" || role === "teacher") && (
              <>
                {role === "admin" && (
                  <ExportButton
                    href={`/api/admin/results/export?${exportQuery.toString()}`}
                  />
                )}

                <FormContainer table="result" type="create" />
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

export default ResultListPage;
