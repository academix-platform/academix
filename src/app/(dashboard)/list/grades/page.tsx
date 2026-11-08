import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { DataPageHeader, DataPageToolbar } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { getTranslations } from "next-intl/server";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { UserRole } from "@/lib/utils";
import prisma from "@/lib/prisma";
import { Grade } from "@prisma/client";
import type { PageSearchParams } from "@/lib/pageParams";
import { Prisma } from "@prisma/client";

type GradeList = Grade & {
  classes: Array<{ id: number; name: string }>;
};

const getColumns = (role: UserRole | null, th: (key: string) => string) => [
  {
    header: th("gradeLevel"),
    accessor: "level",
  },
  {
    header: th("classes"),
    accessor: "classes",
    className: "hidden md:table-cell",
  },
  {
    header: role === "admin" ? th("actions") : "",
    accessor: "action",
  },
];

const renderRow = (
  item: GradeList,
  role: UserRole | null,
  gradeLabel: string,
) => (
  <tr
    key={item.id}
    className="hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors text-xs md:text-sm"
  >
    <td className="px-4 py-3">
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
          {gradeLabel}
        </span>
        {/* Mobile secondary info: classes badges */}
        <div className="flex flex-wrap items-center gap-1 mt-1 md:hidden">
          {item.classes.length > 0 ? (
            item.classes.map((cls) => (
              <Badge
                key={cls.id}
                variant="secondary"
                size="sm"
                className="text-[10px] py-0 px-1.5 font-normal"
              >
                {cls.name}
              </Badge>
            ))
          ) : (
            <span className="text-[11px] text-slate-400">—</span>
          )}
        </div>
      </div>
    </td>

    <td className="hidden md:table-cell px-4 py-3">
      <div className="flex flex-wrap items-center gap-1">
        {item.classes.length > 0 ? (
          item.classes.map((classItem) => (
            <Badge
              key={classItem.id}
              variant="primary"
              size="sm"
              className="font-normal"
            >
              {classItem.name}
            </Badge>
          ))
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </div>
    </td>

    <td className="px-4 py-3">
      <div className="flex items-center gap-1.5">
        {role === "admin" && (
          <FormContainer table="grade" type="delete" id={item.id} data={item} />
        )}
      </div>
    </td>
  </tr>
);

const GradeListPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const t = await getTranslations("pages");
  const th = await getTranslations("tableHeaders");
  const emptyT = await getTranslations("emptyStates");
  const filtersT = await getTranslations("filters");
  const { role, schoolId } = await enforceRouteAccess("/list/grades");

  const resolvedSearchParams = await searchParams;
  const p = Number(resolvedSearchParams?.page) || 1;
  const q =
    typeof resolvedSearchParams?.search === "string"
      ? resolvedSearchParams.search.trim()
      : "";

  const numericSearch = Number(q);
  const query: Prisma.GradeWhereInput = {
    schoolId,
    ...(q
      ? {
          OR: [
            ...(Number.isNaN(numericSearch) ? [] : [{ level: numericSearch }]),
            {
              classes: {
                some: {
                  name: {
                    contains: q,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        }
      : {}),
  };

  const [data, count] = await prisma.$transaction([
    prisma.grade.findMany({
      where: query,
      include: {
        classes: {
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { level: "asc" },
      take: ITEM_PER_PAGE,
      skip: (p - 1) * ITEM_PER_PAGE,
    }),
    prisma.grade.count({ where: query }),
  ]);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <DataPageHeader
        title={t("allGrades")}
        count={count}
        actions={
          role === "admin" ? (
            <FormContainer table="grade" type="create" />
          ) : undefined
        }
      />

      <DataPageToolbar search={<TableSearch />} />

      <Table
        columns={getColumns(role, th)}
        renderRow={(item) =>
          renderRow(
            item,
            role,
            filtersT("gradeLevel", { level: item.level }),
          )
        }
        data={data}
        emptyTitle={emptyT("grades")}
        emptyDescription={emptyT("searchDescription")}
      />

      <Pagination page={p} count={count} />
    </div>
  );
};

export default GradeListPage;
