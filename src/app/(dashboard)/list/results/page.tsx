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
import { Prisma } from "@prisma/client";

type ResultList = {
  id: number;
  title: string;
  subjectName: string;
  studentId: string;
  studentName: string;
  teacherName: string;
  score: number;
  className: string;
  startTime: Date;
  examId: number | null;
  assignmentId: number | null;
};

const getColumns = (role: UserRole | null) => {
  const columns = [
    {
      header: "Title",
      accessor: "name",
    },
    ...(role !== "student"
      ? [
          {
            header: "Student",
            accessor: "student",
          },
        ]
      : []),
    {
      header: "Subject",
      accessor: "subject",
      className: "hidden md:table-cell",
    },
    {
      header: "Score",
      accessor: "score",
      className: "hidden md:table-cell",
    },
    ...(role !== "teacher"
      ? [
          {
            header: "Teacher",
            accessor: "teacher",
            className: "hidden md:table-cell",
          },
        ]
      : []),
    {
      header: "Class",
      accessor: "class",
      className: "hidden md:table-cell",
    },
    {
      header: "Date",
      accessor: "date",
      className: "hidden md:table-cell",
    },
    {
      header: role === "admin" || role === "teacher" ? "Actions" : "",
      accessor: "action",
    },
  ];

  return columns;
};

const renderRow = (item: ResultList, role: UserRole | null) => (
  <tr
    key={item.id}
    className="hover:bg-academixPurpleLight even:bg-slate-50 border-gray-200 border-b text-sm"
  >
    <td className="flex items-center gap-4 p-4">{item.title}</td>
    {role !== "student" && <td>{item.studentName}</td>}
    <td className="hidden md:table-cell">{item.subjectName}</td>
    <td className="hidden md:table-cell">{item.score}</td>
    {role !== "teacher" && (
      <td className="hidden md:table-cell">{item.teacherName}</td>
    )}
    <td className="hidden md:table-cell">{item.className}</td>
    <td className="hidden md:table-cell">
      {new Intl.DateTimeFormat("en-US").format(item.startTime)}
    </td>
    <td>
      <div className="flex items-center gap-2">
        {(role === "admin" || role === "teacher") && (
          <>
            <FormContainer table="result" type="update" data={item} />
            <FormContainer table="result" type="delete" id={item.id} />
          </>
        )}
      </div>
    </td>
  </tr>
);
const ResultListPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const { role, userId } = await enforceRouteAccess("/list/results");
  const resolvedSearchParams = await searchParams;
  const { page, ...queryParams } = resolvedSearchParams;
  const currentPage = getQueryParam(page);
  const p = currentPage ? parseInt(currentPage) : 1;

  const query: Prisma.ResultWhereInput = {};
  if (queryParams) {
    for (const [key, rawValue] of Object.entries(queryParams)) {
      const value = getQueryParam(rawValue);
      if (value !== undefined) {
        switch (key) {
          case "studentId": {
            query.studentId = value;
            break;
          }
          case "search": {
            query.OR = [
              { student: { name: { contains: value, mode: "insensitive" } } },
              { exam: { title: { contains: value, mode: "insensitive" } } },
            ];
            break;
          }
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
      query.OR = [
        { exam: { lesson: { teacherId: userId! } } },
        { assignment: { lesson: { teacherId: userId! } } },
      ];
      break;
    case "student":
      query.studentId = userId!;
      break;
    case "parent":
      query.student = { parentId: userId! };
      break;

    default:
      break;
  }

  const [dataRes, count] = await prisma.$transaction([
    prisma.result.findMany({
      where: query,
      include: {
        student: { select: { name: true } },
        exam: {
          include: {
            lesson: {
              select: {
                subject: { select: { name: true } },
                teacher: { select: { name: true } },
                class: { select: { name: true } },
              },
            },
          },
        },
        assignment: {
          include: {
            lesson: {
              select: {
                subject: { select: { name: true } },
                teacher: { select: { name: true } },
                class: { select: { name: true } },
              },
            },
          },
        },
      },
      take: ITEM_PER_PAGE,
      skip: (p - 1) * ITEM_PER_PAGE,
    }),
    prisma.result.count({
      where: query,
    }),
  ]);

  const data = dataRes.flatMap((item) => {
    const assesment = item.exam || item.assignment;

    if (!assesment) return [];

    const isExam = "startTime" in assesment;
    return [
      {
        id: item.id,
        title: assesment.title,
        subjectName: assesment.lesson.subject.name,
        studentId: item.studentId,
        studentName: item.student.name,
        teacherName: assesment.lesson.teacher.name,
        score: item.score,
        className: assesment.lesson.class.name,
        startTime: isExam ? assesment.startTime : assesment.startDate,
        examId: item.examId,
        assignmentId: item.assignmentId,
      },
    ];
  });

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      {/* TOP */}
      <div className="flex justify-between items-center">
        <h1 className="hidden md:block font-semibold text-lg">All Results</h1>
        <div className="flex md:flex-row flex-col items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center self-end gap-4">
            <FilterSortActions />
            {(role === "admin" || role === "teacher") && (
              <FormContainer table="result" type="create" />
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

export default ResultListPage;
