import ExportButton from "@/components/ExportButton";
import FilterSortActions from "@/components/FilterSortActions";
import FormContainer from "@/components/FormContainer";
import ClassFilter from "@/components/ClassFilter";
import GradeFilter from "@/components/GradeFilter";
import NoCurrentAcademicYearMessage from "@/components/NoCurrentAcademicYearMessage";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { getTranslations } from "next-intl/server";
import TakeExamConfirmation from "@/components/exam/TakeExamConfirmation";
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
  teacher: Pick<Teacher, "name"> | null;
  lesson: {
    teacher: Pick<Teacher, "name">;
  } | null;
  studentSubmission?: {
    status: string;
    gradePublished: boolean;
    totalScore: number | null;
    startedAt: Date;
    extraTime: number | null;
  } | null;
  questions?: { points: number }[];
};

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);

const getColumns = (role: UserRole | null, th: (key: string) => string) => {
  const columns: {
    header: string;
    accessor: string;
    className?: string;
  }[] = [
    {
      header: th("title"),
      accessor: "title",
    },
    {
      header: th("subject"),
      accessor: "subject",
    },
  ];

  if (role !== "student") {
    columns.push({
      header: th("class"),
      accessor: "class",
    });
  }

  if (role !== "teacher") {
    columns.push({
      header: th("teacher"),
      accessor: "teacher",
      className: "hidden md:table-cell",
    });
  }

  columns.push(
    {
      header: th("startTime"),
      accessor: "startTime",
      className: "hidden md:table-cell min-w-[180px] w-[180px]",
    },
    {
      header: th("endTime"),
      accessor: "endTime",
      className: "hidden md:table-cell min-w-[180px] w-[180px]",
    },
  );

  if (role === "student") {
    columns.push({
      header: th("status"),
      accessor: "myStatus",
    });
    columns.push({
      header: th("score"),
      accessor: "myScore",
    });
  }

  columns.push({
    header: role === "admin" || role === "teacher" ? th("actions") : "",
    accessor: "action",
  });

  return columns;
};

const renderRow = (item: ExamList, role: UserRole | null) => {
  const sub = item.studentSubmission;
  const isTimerExpired =
    sub &&
    sub.status === "IN_PROGRESS" &&
    Date.now() >
      new Date(sub.startedAt).getTime() +
        ((item.duration ?? 0) + (sub.extraTime ?? 0)) * 60000;
  const hasExamEnded = Date.now() > new Date(item.endTime).getTime();
  const maxScore = item.questions?.reduce((sum, q) => sum + q.points, 0) ?? 0;

  return (
    <tr
      key={item.id}
      className="hover:bg-academixPurpleLight even:bg-slate-50 border-gray-200 border-b text-sm"
    >
      <td className="p-4">{item.title}</td>

      <td className="flex items-center gap-4 p-4">
        {item.subject?.name ?? "-"}
      </td>

      {role !== "student" && (
        <td>{item.displayClasses ?? item.class?.name ?? "-"}</td>
      )}

      {role !== "teacher" && (
        <td className="hidden md:table-cell">
          {item.teacher?.name ?? item.lesson?.teacher.name ?? "-"}
        </td>
      )}

      <td className="hidden md:table-cell w-[180px] min-w-[180px]">
        {formatDateTime(item.startTime)}
      </td>

      <td className="hidden md:table-cell w-[180px] min-w-[180px]">
        {formatDateTime(item.endTime)}
      </td>

      {role === "student" && (
        <td className="py-4 pr-4 text-left">
          {(() => {
            if (!sub) {
              if (hasExamEnded) {
                return (
                  <span className="bg-gray-100 px-2 py-1 rounded-md font-medium text-gray-500 text-xs whitespace-nowrap">
                    Ended
                  </span>
                );
              }
              return (
                <span className="bg-gray-100 px-2 py-1 rounded-md font-medium text-gray-500 text-xs whitespace-nowrap">
                  Not Started
                </span>
              );
            }
            if (
              sub.status === "IN_PROGRESS" &&
              (isTimerExpired || hasExamEnded)
            ) {
              return (
                <span className="bg-red-100 px-2 py-1 rounded-md font-medium text-red-700 text-xs whitespace-nowrap">
                  Ended
                </span>
              );
            }
            if (sub.status === "IN_PROGRESS")
              return (
                <span className="bg-yellow-100 px-2 py-1 rounded-md font-medium text-yellow-700 text-xs">
                  In Progress
                </span>
              );
            if (sub.status === "SUBMITTED")
              return (
                <span className="bg-blue-100 px-2 py-1 rounded-md font-medium text-blue-700 text-xs">
                  Submitted
                </span>
              );
            if (sub.status === "GRADED" && !sub.gradePublished)
              return (
                <span className="bg-orange-100 px-2 py-1 rounded-md font-medium text-orange-700 text-xs">
                  Graded
                </span>
              );
            if (sub.status === "GRADED" && sub.gradePublished)
              return (
                <span className="bg-green-100 px-2 py-1 rounded-md font-medium text-green-700 text-xs">
                  Published
                </span>
              );
          })()}
        </td>
      )}

      {role === "student" && (
        <td className="py-4 pr-4 font-semibold text-academixPurpleDark text-left">
          {item.studentSubmission?.gradePublished &&
          item.studentSubmission.totalScore !== null ? (
            `${item.studentSubmission.totalScore}/${maxScore}`
          ) : (
            <span className="font-normal text-gray-300">—</span>
          )}
        </td>
      )}

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
          {role === "student" && !item.studentSubmission && !hasExamEnded && (
            <TakeExamConfirmation
              examId={item.id}
              title={item.title}
              instructions={item.instructions}
            />
          )}
          {role === "student" &&
            item.studentSubmission?.status === "IN_PROGRESS" &&
            !isTimerExpired &&
            !hasExamEnded && (
              <Link href={`/list/exams/${item.id}/take`}>
                <button className="bg-yellow-500 hover:opacity-90 px-3 py-2 rounded-md font-semibold text-white text-xs transition">
                  Continue
                </button>
              </Link>
            )}
        </div>
      </td>
    </tr>
  );
};

const ExamListPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const t = await getTranslations("pages");
  const th = await getTranslations("tableHeaders");
  const examT = await getTranslations("examList");
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
        teacher: {
          select: {
            name: true,
          },
        },
        questions: {
          select: {
            points: true,
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
  const [classes, grades] =
    role === "admin"
      ? await prisma.$transaction([
          prisma.class.findMany({
            where: { schoolId },
            select: { id: true, name: true },
            orderBy: { name: "asc" },
          }),
          prisma.grade.findMany({
            where: { schoolId },
            select: { id: true, level: true },
            orderBy: { level: "asc" },
          }),
        ])
      : [[], []];

  const classGroups = new Map<string, Set<string>>();
  const uniqueExamsMap = new Map<string, (typeof data)[0]>();

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

    if (!uniqueExamsMap.has(groupKey)) {
      uniqueExamsMap.set(groupKey, exam);
    }
  }

  // For student role: fetch their submission status for each displayed exam
  let studentSubmissionsMap = new Map<
    number,
    {
      status: string;
      gradePublished: boolean;
      totalScore: number | null;
      startedAt: Date;
      extraTime: number | null;
    }
  >();
  if (role === "student") {
    const examIds = data.map((e) => e.id);
    const studentSubmissions = await prisma.submission.findMany({
      where: { studentId: userId, examId: { in: examIds }, schoolId },
      select: {
        examId: true,
        status: true,
        gradePublished: true,
        totalScore: true,
        startedAt: true,
        extraTime: true,
      },
    });
    for (const sub of studentSubmissions) {
      studentSubmissionsMap.set(sub.examId, {
        status: sub.status,
        gradePublished: sub.gradePublished,
        totalScore: sub.totalScore ?? null,
        startedAt: sub.startedAt,
        extraTime: sub.extraTime,
      });
    }
  }

  const dataWithClassDisplay: ExamList[] = Array.from(
    uniqueExamsMap.values(),
  ).map((exam) => {
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
      studentSubmission:
        role === "student"
          ? (studentSubmissionsMap.get(exam.id) ?? null)
          : undefined,
    };
  });

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="font-semibold text-lg">{t("allExams")}</h1>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <TableSearch />
          {role === "admin" && (
            <>
              <GradeFilter grades={grades} />
              <ClassFilter classes={classes} />
            </>
          )}

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
                  {examT("addExam")}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <Table
        columns={getColumns(role, th)}
        renderRow={(item) => renderRow(item, role)}
        data={dataWithClassDisplay}
        emptyTitle={examT("noExams")}
        emptyDescription={examT("emptyDescription")}
      />

      <Pagination page={p} count={count} />
    </div>
  );
};

export default ExamListPage;
