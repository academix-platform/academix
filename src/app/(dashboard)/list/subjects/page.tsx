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
import { Prisma, Subject, Teacher } from "@prisma/client";

type SubjectList = Subject & {
  teachers: Teacher[];
  grade: { id: number; level: number } | null;
};

const getColumns = (role: UserRole | null) => [
  {
    header: "Subject Name",
    accessor: "name",
  },
  {
    header: "Grade",
    accessor: "grade",
    className: "hidden md:table-cell",
  },
  {
    header: "Teachers",
    accessor: "teachers",
    className: "hidden md:table-cell",
  },
  {
    header: role === "admin" ? "Actions" : "",
    accessor: "action",
  },
];

const renderRow = (item: SubjectList, role: UserRole | null) => (
  <tr
    key={item.id}
    className="hover:bg-academixPurpleLight even:bg-slate-50 border-gray-200 border-b text-sm"
  >
    <td className="flex items-center gap-4 p-4">{item.name}</td>
    <td className="hidden md:table-cell">{item.grade?.level ?? "-"}</td>
    <td className="hidden md:table-cell">
      {item.teachers.map((t) => t.name).join(", ")}
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
  const resolvedSearchParams = await searchParams;
  const { page, ...queryParams } = resolvedSearchParams;
  const currentPage = getQueryParam(page);
  const p = currentPage ? parseInt(currentPage) : 1;

  const query: Prisma.SubjectWhereInput = { schoolId };
  const conditions: Prisma.SubjectWhereInput[] = [];
  if (queryParams) {
    for (const [key, rawValue] of Object.entries(queryParams)) {
      const value = getQueryParam(rawValue);

      if (value !== undefined) {
        switch (key) {
          case "search":
            conditions.push({
              name: { contains: value, mode: "insensitive" },
            });
            break;
        }
      }
    }
  }

  // ROLE CONDITIONS
  switch (role) {
    case "admin":
      break;

    case "teacher":
      if (!userId) throw new Error("Unauthorized");

      conditions.push({
        teachers: {
          some: { id: userId },
        },
      });
      break;

    case "student":
      if (!userId) throw new Error("Unauthorized");

      const student = await prisma.student.findUnique({
        where: { id: userId },
        select: { gradeId: true },
      });

      if (student?.gradeId) {
        conditions.push({
          gradeId: student.gradeId,
        });
      }
      break;

    case "parent":
      if (!userId) throw new Error("Unauthorized");

      const children = await prisma.student.findMany({
        where: { parentId: userId },
        select: { gradeId: true },
      });

      const gradeIds = children.map((c) => c.gradeId);

      if (gradeIds.length > 0) {
        conditions.push({
          gradeId: { in: gradeIds },
        });
      } else {
        conditions.push({ id: -1 });
      }

      break;

    default:
      break;
  }

  if (conditions.length > 0) {
    query.AND = conditions;
  }

  const [data, count] = await prisma.$transaction([
    prisma.subject.findMany({
      where: query,
      include: {
        teachers: true,
        grade: true,
      },
      orderBy: { name: "asc" },
      take: ITEM_PER_PAGE,
      skip: (p - 1) * ITEM_PER_PAGE,
    }),
    prisma.subject.count({
      where: query,
    }),
  ]);
  return (
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      {/* TOP */}
      <div className="flex justify-between items-center">
        <h1 className="hidden md:block font-semibold text-lg">All Subjects</h1>
        <div className="flex md:flex-row flex-col items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center self-end gap-4">
            <FilterSortActions />
            {role === "admin" && (
              <FormContainer table="subject" type="create" />
            )}
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table
        columns={getColumns(role)}
        renderRow={(item) => renderRow(item, role)}
        data={data}
      />
      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default SubjectListPage;
