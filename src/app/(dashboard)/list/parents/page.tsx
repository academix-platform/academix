import ExportButton from "@/components/ExportButton";
import FilterSortActions from "@/components/FilterSortActions";
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { buildParentQuery } from "@/lib/query-builders/parent-query";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { UserRole } from "@/lib/utils";
import { Parent, Student } from "@prisma/client";
import type { PageSearchParams } from "@/lib/pageParams";

type ParentList = Parent & { students: Student[] };

const getColumns = (role: UserRole | null) => [
  { header: "Info", accessor: "info" },
  {
    header: "Student Names",
    accessor: "students",
    className: "hidden md:table-cell",
  },
  {
    header: "Phone",
    accessor: "phone",
    className: "hidden lg:table-cell",
  },
  {
    header: "Address",
    accessor: "address",
    className: "hidden lg:table-cell",
  },
  {
    header: role === "admin" ? "Actions" : "",
    accessor: "action",
  },
];

const renderRow = (item: ParentList, role: UserRole | null) => (
  <tr
    key={item.id}
    className="hover:bg-academixPurpleLight even:bg-slate-50 border-gray-200 border-b text-sm"
  >
    <td className="flex items-center gap-4 p-4">
      <div className="flex flex-col">
        <h3 className="font-semibold">{item.name}</h3>
        <p className="text-gray-500 text-xs">{item.email}</p>
      </div>
    </td>

    <td className="hidden md:table-cell">
      {item.students.map((s) => s.name).join(", ")}
    </td>

    <td className="hidden md:table-cell">{item.phone}</td>
    <td className="hidden md:table-cell">{item.address}</td>

    <td>
      <div className="flex items-center gap-2">
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

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="font-semibold text-lg">All Parents</h1>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <TableSearch />

          <div className="flex items-center self-end gap-2">
            <FilterSortActions sortKey="sort" />

            {role === "admin" && (
              <>
                <ExportButton
                  href={`/api/admin/parents/export?${exportQuery.toString()}`}
                />

                <FormContainer table="parent" type="create" />
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

export default ParentListPage;
