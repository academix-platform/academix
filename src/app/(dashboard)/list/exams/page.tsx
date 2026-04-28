import FilterSortActions from "@/components/FilterSortActions";
import FormContainer from "@/components/FormContainer";
import NoCurrentAcademicYearMessage from "@/components/NoCurrentAcademicYearMessage";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { type UserRole } from "@/lib/auth";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { getCurrentAcademicYearIdOrNull } from "@/lib/academicYears";
import { Class, Exam, Prisma, Subject, Teacher } from "@prisma/client";

type ExamList = Exam & {
  displayClasses?: string;
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
    header: "Start Time",
    accessor: "startTime",
    className: "hidden md:table-cell",
  });

  columns.push({
    header: "End Time",
    accessor: "endTime",
    className: "hidden md:table-cell",
  });

  columns.push({
    header: role === "admin" || role === "teacher" ? "Actions" : "",
    accessor: "action",
  });

  return columns;
};

const renderRow = (item: ExamList, role: UserRole | null) => (
  <tr
    key={item.id}
    className="hover:bg-academixPurpleLight even:bg-slate-50 border-gray-200 border-b text-sm"
  >
    <td className="p-4">{item.title}</td>
    <td className="flex items-center gap-4 p-4">{item.subject?.name}</td>
    {role !== "student" && <td>{item.displayClasses ?? item.class?.name}</td>}
    {role !== "teacher" && (
      <td className="hidden md:table-cell">{item.lesson.teacher.name}</td>
    )}
    <td className="hidden md:table-cell">
      {new Intl.DateTimeFormat("en-US", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(item.startTime)}
    </td>
    <td className="hidden md:table-cell">
      {new Intl.DateTimeFormat("en-US", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(item.endTime)}
    </td>
    <td>
      <div className="flex items-center gap-2">
        {(role === "admin" || role === "teacher") && (
          <>
            <FormContainer table="exam" type="update" data={item} />
            <FormContainer table="exam" type="delete" id={item.id} />
          </>
        )}
      </div>
    </td>
  </tr>
);
const ExamListPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const { role, userId } = await enforceRouteAccess("/list/exams");
  const resolvedSearchParams = await searchParams;
  const { page, ...queryParams } = resolvedSearchParams;
  const currentPage = getQueryParam(page);
  const p = currentPage ? parseInt(currentPage) : 1;
  const academicYearId = await getCurrentAcademicYearIdOrNull();

  if (!academicYearId) {
    return <NoCurrentAcademicYearMessage />;
  }

  const query: Prisma.ExamWhereInput = { academicYearId };
  query.lesson = {};
  if (queryParams) {
    for (const [key, rawValue] of Object.entries(queryParams)) {
      const value = getQueryParam(rawValue);
      if (value !== undefined) {
        switch (key) {
          case "classId": {
            query.lesson.classId = parseInt(value);
            break;
          }
          case "teacherId": {
            query.lesson.teacherId = value;
            break;
          }
          case "search":
            query.lesson.subject = {
              name: { contains: value, mode: "insensitive" },
            };
            break;
          default:
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
      query.lesson.teacherId = userId!;
      break;
    case "student":
      query.lesson.class = {
        students: {
          some: {
            id: userId!,
          },
        },
      };
      break;
    case "parent":
      query.lesson.class = {
        students: {
          some: {
            parentId: userId!,
          },
        },
      };
      break;

    default:
      break;
  }

  const [data, count] = await prisma.$transaction([
    prisma.exam.findMany({
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
      take: ITEM_PER_PAGE,
      skip: (p - 1) * ITEM_PER_PAGE,
    }),
    prisma.exam.count({
      where: query,
    }),
  ]);

  const dataWithClassDisplay: ExamList[] =
    role === "admin" || role === "teacher"
      ? (() => {
          const classGroups = new Map<string, Set<string>>();

          for (const exam of data) {
            const groupKey = [
              exam.title,
              exam.startTime.toISOString(),
              exam.endTime.toISOString(),
              exam.subject?.name,
            ].join("|");

            if (!classGroups.has(groupKey)) {
              classGroups.set(groupKey, new Set<string>());
            }

            if (exam.class?.name) {
              classGroups.get(groupKey)!.add(exam.class.name);
            }
          }

          return data.map((exam) => {
            const groupKey = [
              exam.title,
              exam.startTime.toISOString(),
              exam.endTime.toISOString(),
              exam.subject?.name,
            ].join("|");

            const groupedClasses = classGroups.get(groupKey);
            return {
              ...exam,
              displayClasses:
                groupedClasses && groupedClasses.size > 1
                  ? Array.from(groupedClasses).sort().join(", ")
                  : exam.class?.name,
            };
          });
        })()
      : data;

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      {/* TOP */}
      <div className="flex justify-between items-center">
        <h1 className="hidden md:block font-semibold text-lg">All Exams</h1>
        <div className="flex md:flex-row flex-col items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center self-end gap-4">
            <FilterSortActions />
            {(role === "admin" || role === "teacher") && (
              <FormContainer table="exam" type="create" />
            )}
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table
        columns={getColumns(role)}
        renderRow={(item) => renderRow(item, role)}
        data={dataWithClassDisplay}
      />
      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default ExamListPage;
