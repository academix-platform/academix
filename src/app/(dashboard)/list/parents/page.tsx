import ExportButton from "@/components/ExportButton";
import FilterSortActions from "@/components/FilterSortActions";
import FormContainer from "@/components/FormContainer";
import ClassFilter from "@/components/ClassFilter";
import GradeFilter from "@/components/GradeFilter";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { DataPageHeader, DataPageToolbar } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { getTranslations } from "next-intl/server";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { buildParentQuery } from "@/lib/query-builders/parent-query";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { UserRole } from "@/lib/utils";
import { Parent, Student } from "@prisma/client";
import type { PageSearchParams } from "@/lib/pageParams";

type ParentList = Parent & { students: Student[] };

const getColumns = (role: UserRole | null, th: (key: string) => string) => [
  { header: th("info"), accessor: "info" },
  {
    header: th("studentNames"),
    accessor: "students",
    className: "hidden md:table-cell",
  },
  {
    header: th("phone"),
    accessor: "phone",
    className: "hidden lg:table-cell",
  },
  {
    header: th("address"),
    accessor: "address",
    className: "hidden lg:table-cell",
  },
  {
    header: role === "admin" ? th("actions") : "",
    accessor: "action",
  },
];

const renderRow = (item: ParentList, role: UserRole | null) => (
  <tr
    key={item.id}
    className="hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors text-xs md:text-sm"
  >
    <td className="px-4 py-3">
      <div className="flex flex-col gap-0.5 min-w-0">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
          {item.name}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
          {item.email || "—"}
        </p>
        {/* Mobile secondary info: children pills and phone */}
        <div className="flex flex-wrap items-center gap-1.5 mt-1 md:hidden">
          {item.students.map((s) => (
            <Badge
              key={s.id}
              variant="secondary"
              size="sm"
              className="text-[10px] py-0 px-1.5 font-normal"
            >
              {s.name}
            </Badge>
          ))}
          {item.phone && (
            <span className="text-[11px] text-slate-500 ps-1">
              {item.phone}
            </span>
          )}
        </div>
      </div>
    </td>

    <td className="hidden md:table-cell px-4 py-3">
      <div className="flex flex-wrap items-center gap-1">
        {item.students.length > 0 ? (
          item.students.map((s) => (
            <Badge
              key={s.id}
              variant="primary"
              size="sm"
              className="font-normal"
            >
              {s.name}
            </Badge>
          ))
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </div>
    </td>

    <td className="hidden lg:table-cell px-4 py-3 text-slate-600 dark:text-slate-300">
      {item.phone || "—"}
    </td>
    <td className="hidden lg:table-cell px-4 py-3 text-slate-600 dark:text-slate-300 max-w-[200px] truncate">
      {item.address || "—"}
    </td>

    <td className="px-4 py-3">
      <div className="flex items-center gap-1.5">
        {role === "admin" && (
          <>
            <FormContainer table="parent" type="update" data={item} />
            <FormContainer table="parent" type="delete" id={item.id} />
          </>
        )}
      </div>
    </td>
  </tr>
);

const ParentListPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const t = await getTranslations("pages");
  const th = await getTranslations("tableHeaders");
  const emptyT = await getTranslations("emptyStates");
  const { role, userId, schoolId } = await enforceRouteAccess("/list/parents");

  const {
    query,
    orderBy,
    page: p,
  } = await buildParentQuery({
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
    prisma.parent.findMany({
      where: query,
      include: {
        students: true,
      },
      orderBy,
      take: ITEM_PER_PAGE,
      skip: (p - 1) * ITEM_PER_PAGE,
    }),
    prisma.parent.count({
      where: query,
    }),
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
        title={t("allParents")}
        count={count}
        actions={
          role === "admin" ? (
            <>
              <ExportButton
                href={`/api/admin/parents/export?${exportQuery.toString()}`}
              />
              <FormContainer table="parent" type="create" />
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
        renderRow={(item) => renderRow(item, role)}
        data={data}
        emptyTitle={emptyT("parents")}
        emptyDescription={emptyT("filterDescription")}
      />

      <Pagination page={p} count={count} />
    </div>
  );
};

export default ParentListPage;
