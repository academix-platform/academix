import ExportButton from "@/components/ExportButton";
import FilterSortActions from "@/components/FilterSortActions";
import FormContainer from "@/components/FormContainer";
import GradeFilter from "@/components/GradeFilter";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { DataPageHeader, DataPageToolbar } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
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

const renderRow = (
  item: ClassList,
  role: UserRole | null,
  th: (key: string) => string,
) => (
  <tr
    key={item.id}
    className="hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors text-xs md:text-sm"
  >
    <td className="px-4 py-3">
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
          {item.name}
        </span>
        {/* Mobile secondary info */}
        <div className="flex flex-wrap items-center gap-1.5 mt-0.5 md:hidden">
          {item.grade && (
            <Badge
              variant="secondary"
              size="sm"
              className="text-[10px] py-0 px-1.5 font-normal"
            >
              Grade {item.grade.level}
            </Badge>
          )}
          <span className="text-[11px] text-slate-500">
            {item.capacity} {th("capacity")}
          </span>
          {item.supervisor && (
            <span className="text-[11px] text-slate-500">
              • {item.supervisor.name}
            </span>
          )}
        </div>
      </div>
    </td>

    <td className="hidden md:table-cell px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">
      {item.capacity}
    </td>

    <td className="hidden md:table-cell px-4 py-3">
      {item.grade ? (
        <Badge variant="primary" size="sm" className="font-normal">
          {item.grade.level}
        </Badge>
      ) : (
        <span className="text-slate-400">—</span>
      )}
    </td>

    <td className="hidden md:table-cell px-4 py-3 text-slate-600 dark:text-slate-300">
      {item.supervisor?.name ?? "—"}
    </td>

    <td className="px-4 py-3">
      <div className="flex items-center gap-1.5">
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
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <DataPageHeader
        title={t("allClasses")}
        count={count}
        actions={
          role === "admin" ? (
            <>
              <ExportButton
                href={`/api/admin/classes/export?${exportQuery.toString()}`}
              />
              <FormContainer table="class" type="create" />
            </>
          ) : undefined
        }
      />

      <DataPageToolbar
        search={<TableSearch />}
        filters={role === "admin" ? <GradeFilter grades={grades} /> : undefined}
        actions={<FilterSortActions sortKey="sort" />}
      />

      <Table
        columns={getColumns(role, th)}
        renderRow={(item) => renderRow(item, role, th)}
        data={data}
        emptyTitle={emptyT("classes")}
        emptyDescription={emptyT("filterDescription")}
      />

      <Pagination page={p} count={count} />
    </div>
  );
};

export default ClassListPage;
