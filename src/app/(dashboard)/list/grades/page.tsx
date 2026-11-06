import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
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

const renderRow = (item: GradeList, role: UserRole | null) => (
  <tr
    key={item.id}
    className="hover:bg-academixPurpleLight even:bg-slate-50 border-gray-200 border-b text-sm"
  >
    <td className="p-4">Grade {item.level}</td>

    <td className="hidden md:table-cell">
      {item.classes.length > 0
        ? item.classes.map((classItem) => classItem.name).join(", ")
        : "-"}
    </td>

    <td>
      <div className="flex items-center gap-2">
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
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="font-semibold text-lg">{t("allGrades")}</h1>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <TableSearch />

          <div className="flex items-center self-end gap-2">
            {role === "admin" && <FormContainer table="grade" type="create" />}
          </div>
        </div>
      </div>

      <Table
        columns={getColumns(role, th)}
        renderRow={(item) => renderRow(item, role)}
        data={data}
        emptyTitle={emptyT("grades")}
        emptyDescription={emptyT("searchDescription")}
      />

      <Pagination page={p} count={count} />
    </div>
  );
};

export default GradeListPage;
