import FilterSortActions from "@/components/FilterSortActions";
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { type UserRole } from "@/lib/auth";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Announcement, Class, Prisma } from "@prisma/client";

type AnnouncementList = Announcement & {
  classes: Pick<Class, "id" | "name">[];
};

const getColumns = (role: UserRole | null) => [
  {
    header: "Title",
    accessor: "title",
  },
  {
    header: "Class",
    accessor: "class",
  },
  {
    header: "Date",
    accessor: "date",
    className: "hidden md:table-cell",
  },
  {
    header: role === "admin" ? "Actions" : "",
    accessor: "action",
  },
];

const renderRow = (
  item: AnnouncementList,
  role: UserRole | null,
  totalClassesCount: number,
) => (
  <tr
    key={item.id}
    className="hover:bg-academixPurpleLight even:bg-slate-50 border-gray-200 border-b text-sm"
  >
    <td className="flex items-center gap-4 p-4">{item.title}</td>
    <td>
      {item.classes.length === totalClassesCount && totalClassesCount > 0
        ? "All Classes"
        : item.classes.map((cls) => cls.name).join(", ") || "-"}
    </td>
    <td className="hidden md:table-cell">
      {" "}
      {new Intl.DateTimeFormat("en-US").format(item.date)}
    </td>
    <td>
      <div className="flex items-center gap-2">
        {role === "admin" && (
          <>
            <FormContainer table="announcement" type="update" data={item} />
            <FormContainer table="announcement" type="delete" id={item.id} />
          </>
        )}
      </div>
    </td>
  </tr>
);
const AnnouncementListPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const { role, userId } = await enforceRouteAccess("/list/announcements");
  const resolvedSearchParams = await searchParams;
  const { page, ...queryParams } = resolvedSearchParams;
  const currentPage = getQueryParam(page);
  const p = currentPage ? parseInt(currentPage) : 1;

  const query: Prisma.AnnouncementWhereInput = {};
  if (queryParams) {
    for (const [key, rawValue] of Object.entries(queryParams)) {
      const value = getQueryParam(rawValue);
      if (value !== undefined) {
        switch (key) {
          case "search": {
            query.title = { contains: value, mode: "insensitive" };
            break;
          }
          default:
            break;
        }
      }
    }
  }

  // ROLE CONDITIONS
  if (role !== "admin") {
    const roleConditions = {
      teacher: { lessons: { some: { teacherId: userId! } } },
      student: { students: { some: { id: userId! } } },
      parent: { students: { some: { parentId: userId! } } },
    };

    query.classes = {
      some: roleConditions[role as keyof typeof roleConditions] || undefined,
    };
  }

  const [data, count, totalClassesCount] = await prisma.$transaction([
    prisma.announcement.findMany({
      where: query,
      include: {
        classes: { select: { id: true, name: true } },
      },
      take: ITEM_PER_PAGE,
      skip: (p - 1) * ITEM_PER_PAGE,
    }),
    prisma.announcement.count({
      where: query,
    }),
    prisma.class.count(),
  ]);

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      {/* TOP */}
      <div className="flex justify-between items-center">
        <h1 className="hidden md:block font-semibold text-lg">
          All Announcements
        </h1>
        <div className="flex md:flex-row flex-col items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center self-end gap-4">
            <FilterSortActions />
            {role === "admin" && (
              <FormContainer table="announcement" type="create" />
            )}
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table
        columns={getColumns(role)}
        renderRow={(item) => renderRow(item, role, totalClassesCount)}
        data={data}
      />
      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default AnnouncementListPage;
