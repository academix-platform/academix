import ExportButton from "@/components/ExportButton";
import FilterSortActions from "@/components/FilterSortActions";
import FormContainer from "@/components/FormContainer";
import NoCurrentAcademicYearMessage from "@/components/NoCurrentAcademicYearMessage";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { buildExamQuery } from "@/lib/query-builders/exam-query";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Class, Exam, Subject, Teacher } from "@prisma/client";
import { UserRole } from "@/lib/utils";
import type { PageSearchParams } from "@/lib/pageParams";
import Link from "next/link";
import { Pencil } from "lucide-react";

type ExamList = Exam & {
  displayClasses?: string;
  subject: Pick<Subject, "name"> | null;
  class: Pick<Class, "name"> | null;
  lesson: {
    teacher: Pick<Teacher, "name">;
  };
};

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);

const getColumns = (role: UserRole | null) => {
  const columns: {
    header: string;
    accessor: string;
    className?: string;
  }[] = [
    {
      header: "Title",
      accessor: "title",
    },
    {
      header: "Subject",
      accessor: "subject",
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

  columns.push(
    {
      header: "Start Time",
      accessor: "startTime",
      className: "hidden md:table-cell min-w-[180px] w-[180px]",
    },
    {
      header: "End Time",
      accessor: "endTime",
      className: "hidden md:table-cell min-w-[180px] w-[180px]",
    },
  );

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

    <td className="flex items-center gap-4 p-4">{item.subject?.name ?? "-"}</td>

    {role !== "student" && (
      <td>{item.displayClasses ?? item.class?.name ?? "-"}</td>
    )}

    {role !== "teacher" && (
      <td className="hidden md:table-cell">{item.lesson.teacher.name}</td>
    )}

    <td className="hidden md:table-cell w-[180px] min-w-[180px]">
      {formatDateTime(item.startTime)}
    </td>

    <td className="hidden md:table-cell w-[180px] min-w-[180px]">
      {formatDateTime(item.endTime)}
    </td>

    <td>
      <div className="flex items-center gap-2">
        {(role === "admin" || role === "teacher") && (
          <div className="flex items-center gap-2">
            <Link
              href={`/list/exams/create-workflow?examId=${item.id}`}
              className="flex justify-center items-center bg-academixPurpleDark p-2 rounded-md text-white hover:scale-[1.05] transition"
              aria-label="Edit exam workflow"
            >
              <Pencil className="w-4 h-4" />
            </Link>
            <FormContainer table="exam" type="delete" id={item.id} />
          </div>
        )}
        {(role === "admin" || role === "teacher") && (
          <Link
            href={`/list/exams/${item.id}/submissions`}
            className="bg-academixYellow hover:opacity-90 px-3 py-2 rounded-md text-xs hover:scale-[1.05] transition"
          >
            Submissions
          </Link>
        )}
        {role === "student" && (
          <Link href={`/list/exams/${item.id}/take`}>
            <button className="bg-academixPurpleDark hover:bg-academixPurple px-3 py-1 rounded-md font-semibold text-white text-xs transition-colors">
              Take Exam
            </button>
          </Link>
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
  const { role, userId, schoolId } = await enforceRouteAccess("/list/exams");

  const resolvedSearchParams = await searchParams;

  const {
    academicYearId,
    query,
    orderBy,
    page: p,
  } = await buildExamQuery({
    searchParams,
    schoolId,
    role,
    userId,
  });

  if (!academicYearId || !query) {
    return <NoCurrentAcademicYearMessage />;
  }

  const exportQuery = new URLSearchParams(
    Object.entries(resolvedSearchParams).flatMap(([key, value]) => {
      if (Array.isArray(value)) {
        return value.map((item) => [key, item]);
      }

      return value ? [[key, value]] : [];
    }),
  );

  const [data, count] = await prisma.$transaction([
    prisma.exam.findMany({
      where: query,
      include: {
        subject: {
          select: {
            name: true,
          },
        },
        class: {
          select: {
            name: true,
          },
        },
        lesson: {
          select: {
            teacher: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy,
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
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="font-semibold text-lg">All Exams</h1>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <TableSearch />

          <div className="flex items-center self-end gap-2">
            <FilterSortActions sortKey="sort" />

            {(role === "admin" || role === "teacher") && (
              <>
                {role === "admin" && (
                  <ExportButton
                    href={`/api/admin/exams/export?${exportQuery.toString()}`}
                  />
                )}
                <Link
                  href="/list/exams/create-workflow"
                  className="bg-academixPurpleDark hover:opacity-90 px-4 py-2 rounded-md font-medium text-white text-sm transition-colors"
                >
                  Add Exam
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <Table
        columns={getColumns(role)}
        renderRow={(item) => renderRow(item, role)}
        data={dataWithClassDisplay}
      />

      <Pagination page={p} count={count} />
    </div>
  );
};

export default ExamListPage;
