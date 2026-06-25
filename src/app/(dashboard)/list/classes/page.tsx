import ExportButton from "@/components/ExportButton";
import FilterSortActions from "@/components/FilterSortActions";
import FormContainer from "@/components/FormContainer";
import GradeFilter from "@/components/GradeFilter";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { getTranslations } from "next-intl/server";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { buildClassQuery } from "@/lib/query-builders/class-query";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { UserRole } from "@/lib/utils";
import { Class, Teacher } from "@prisma/client";
import type { PageSearchParams } from "@/lib/pageParams";

type ClassList = Class & {
  supervisor: Teacher | null;
  grade: {
    level: number;
  } | null;
};

const getColumns = (role: UserRole | null, th: (key: string) => string) => [
  { header: th("className"), accessor: "name" },
  {
    header: th("capacity"),
    accessor: "capacity",
    className: "hidden md:table-cell",
  },
  {
    header: th("grade"),
    accessor: "grade",
    className: "hidden md:table-cell",
  },
  {
    header: th("supervisor"),
    accessor: "supervisor",
    className: "hidden md:table-cell",
  },
  {
    header: role === "admin" ? th("actions") : "",
    accessor: "action",
  },
];

const renderRow = (item: ClassList, role: UserRole | null) => (
  <tr
    key={item.id}
    className="hover:bg-academixPurpleLight even:bg-slate-50 border-gray-200 border-b text-sm"
  >
    <td className="flex items-center gap-4 p-4">{item.name}</td>

    <td className="hidden md:table-cell">{item.capacity}</td>

    <td className="hidden md:table-cell">{item.grade?.level ?? "-"}</td>

    <td className="hidden md:table-cell">
      {item.supervisor?.name ?? "No supervisor"}
    </td>

    <td>
      <div className="flex items-center gap-2">
        {role === "admin" && (
          <>
            <FormContainer table="class" type="update" data={item} />
            <FormContainer table="class" type="delete" id={item.id} />
          </>
        )}
      </div>
    </td>
  </tr>
);

const ClassListPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const t = await getTranslations("pages");
  const th = await getTranslations("tableHeaders");
  const emptyT = await getTranslations("emptyStates");
  const { role, userId, schoolId } = await enforceRouteAccess("/list/classes");

  const resolvedSearchParams = await searchParams;

  const {
    query,
    orderBy,
    page: p,
  } = await buildClassQuery({
    searchParams,
    schoolId,
    role,
    userId,
  });

  const exportQuery = new URLSearchParams(
    Object.entries(resolvedSearchParams).flatMap(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map((item) => [key, item]);
      }

      return value ? [[key, value]] : [];
    }),
  );

  const [data, count] = await prisma.$transaction([
    prisma.class.findMany({
      where: query,
      include: {
        supervisor: true,
        grade: {
          select: {
            level: true,
          },
        },
      },
      orderBy,
      take: ITEM_PER_PAGE,
      skip: (p - 1) * ITEM_PER_PAGE,
    }),
    prisma.class.count({
      where: query,
    }),
  ]);
  const grades =
    role === "admin"
      ? await prisma.grade.findMany({
          where: { schoolId },
          select: { id: true, level: true },
          orderBy: { level: "asc" },
        })
      : [];

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="font-semibold text-lg">{t("allClasses")}</h1>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <TableSearch />
          {role === "admin" && <GradeFilter grades={grades} />}

          <div className="flex items-center self-end gap-2">
            <FilterSortActions sortKey="sort" />

            {role === "admin" && (
              <>
                <ExportButton
                  href={`/api/admin/classes/export?${exportQuery.toString()}`}
                />

                <FormContainer table="class" type="create" />
              </>
            )}
          </div>
        </div>
      </div>

      <Table
        columns={getColumns(role, th)}
        renderRow={(item) => renderRow(item, role)}
        data={data}
        emptyTitle={emptyT("classes")}
        emptyDescription={emptyT("filterDescription")}
      />

      <Pagination page={p} count={count} />
    </div>
  );
};

export default ClassListPage;
