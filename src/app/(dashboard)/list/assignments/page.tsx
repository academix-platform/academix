import FilterSortActions from "@/components/FilterSortActions";
import FormContainer from "@/components/FormContainer";
import NoCurrentAcademicYearMessage from "@/components/NoCurrentAcademicYearMessage";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { getCurrentAcademicYearIdOrNull } from "@/lib/academicYears";
import { Assignment, Class, Prisma, Subject, Teacher } from "@prisma/client";
import { UserRole } from "@/lib/utils";

type AssignmentList = Assignment & {
  subject: Pick<Subject, "name"> | null;
  class: Pick<Class, "name"> | null;
  lesson: {
    teacher: Pick<Teacher, "name">;
  };
};

const getColumns = (role: UserRole | null) => {
  const columns: { header: string; accessor: string; className?: string }[] = [
    {
      header: "Title",
      accessor: "title",
    },
    {
      header: "Subject",
      accessor: "name",
    },
  ];

  if (role !== "student") {
    columns.push({
      header: "Class",
      accessor: "class",
    });
  }

  if (role !== "teacher") {
    columns.push({
      header: "Teacher",
      accessor: "teacher",
      className: "hidden md:table-cell",
    });
  }

  columns.push({
    header: "Start Date",
    accessor: "startDate",
    className: "hidden md:table-cell",
  });

  columns.push({
    header: "End Date",
    accessor: "endDate",
    className: "hidden md:table-cell",
  });

  columns.push({
    header: role === "admin" || role === "teacher" ? "Actions" : "",
    accessor: "action",
  });

  return columns;
};

const renderRow = (item: AssignmentList, role: UserRole | null) => (
  <tr
    key={item.id}
    className="hover:bg-academixPurpleLight even:bg-slate-50 border-gray-200 border-b text-sm"
  >
    <td className="p-4">{item.title}</td>
    <td className="flex items-center gap-4 p-4">{item.subject?.name}</td>
    {role !== "student" && <td>{item.class?.name}</td>}
    {role !== "teacher" && (
      <td className="hidden md:table-cell">{item.lesson.teacher.name}</td>
    )}
    <td className="hidden md:table-cell">
      {new Intl.DateTimeFormat("en-US", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(item.startDate)}
    </td>
    <td className="hidden md:table-cell">
      {new Intl.DateTimeFormat("en-US", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(item.endDate)}
    </td>
    <td>
      <div className="flex items-center gap-2">
        {(role === "admin" || role === "teacher") && (
          <>
            <FormContainer table="assignment" type="update" data={item} />
            <FormContainer table="assignment" type="delete" id={item.id} />
          </>
        )}
      </div>
    </td>
  </tr>
);
const AssignmentListPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const { role, userId, schoolId } =
    await enforceRouteAccess("/list/assignments");
  const resolvedSearchParams = await searchParams;
  const { page, ...queryParams } = resolvedSearchParams;
  const currentPage = getQueryParam(page);
  const p = currentPage ? parseInt(currentPage) : 1;

  const academicYearId = await getCurrentAcademicYearIdOrNull(schoolId);

  if (!academicYearId) {
    return <NoCurrentAcademicYearMessage />;
  }

  const query: Prisma.AssignmentWhereInput = {
    schoolId,
    academicYearId,
  };
  query.lesson = query.lesson || {};

  const conditions: Prisma.AssignmentWhereInput[] = [];

  if (queryParams) {
    for (const [key, rawValue] of Object.entries(queryParams)) {
      const value = getQueryParam(rawValue);

      if (value !== undefined) {
        switch (key) {
          case "classId":
            conditions.push({
              lesson: {
                classId: parseInt(value),
              },
            });
            break;

          case "teacherId":
            conditions.push({
              lesson: {
                teacherId: value,
              },
            });
            break;

          case "search":
            conditions.push({
              lesson: {
                subject: {
                  name: { contains: value, mode: "insensitive" },
                },
              },
            });
            break;
        }
      }
    }
  }

  switch (role) {
    case "admin":
      break;

    case "teacher":
      conditions.push({
        lesson: {
          teacherId: userId,
        },
      });
      break;

    case "student":
      conditions.push({
        lesson: {
          class: {
            students: {
              some: { id: userId },
            },
          },
        },
      });
      break;

    case "parent":
      conditions.push({
        lesson: {
          class: {
            students: {
              some: { parentId: userId },
            },
          },
        },
      });
      break;
  }
  if (conditions.length > 0) {
    query.AND = conditions;
  }

  const [data, count] = await prisma.$transaction([
    prisma.assignment.findMany({
      where: query,
      include: {
        subject: { select: { name: true } },
        class: { select: { name: true } },
        lesson: {
          select: {
            teacher: { select: { name: true } },
          },
        },
      },
      orderBy: { startDate: "desc" },
      take: ITEM_PER_PAGE,
      skip: (p - 1) * ITEM_PER_PAGE,
    }),
    prisma.assignment.count({
      where: query,
    }),
  ]);
  return (
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      {/* TOP */}
      <div className="flex justify-between items-center">
        <h1 className="hidden md:block font-semibold text-lg">
          All Assignments
        </h1>
        <div className="flex md:flex-row flex-col items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center self-end gap-4">
            <FilterSortActions />
            {(role === "admin" || role === "teacher") && (
              <FormContainer table="assignment" type="create" />
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

export default AssignmentListPage;
