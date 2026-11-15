import ExportButton from "@/components/ExportButton";
import FilterSortActions from "@/components/FilterSortActions";
import FormContainer from "@/components/FormContainer";
import ClassFilter from "@/components/ClassFilter";
import GradeFilter from "@/components/GradeFilter";
import NoCurrentAcademicYearMessage from "@/components/NoCurrentAcademicYearMessage";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { DataPageHeader, DataPageToolbar } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { getLocale, getTranslations } from "next-intl/server";
import TakeExamConfirmation from "@/components/exam/TakeExamConfirmation";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { buildExamQuery } from "@/lib/query-builders/exam-query";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Class, Exam, Subject, Teacher } from "@prisma/client";
import { UserRole } from "@/lib/utils";
import type { PageSearchParams } from "@/lib/pageParams";
import Link from "next/link";
import { Pencil, Plus, Users } from "lucide-react";

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

const formatDateTime = (date: Date, locale: string = "en") =>
  new Intl.DateTimeFormat(locale, {
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

const renderRow = (
  item: ExamList,
  role: UserRole | null,
  locale: string = "en",
  actionsT?: (key: string) => string,
) => {
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
      className="hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors text-xs md:text-sm"
    >
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
            {item.title}
          </span>
          {/* Mobile secondary info */}
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 md:hidden text-xs text-slate-500 dark:text-slate-400">
            {item.subject?.name && (
              <Badge
                variant="secondary"
                size="sm"
                className="text-[10px] py-0 px-1.5 font-normal"
              >
                {item.subject.name}
              </Badge>
            )}
            {(item.displayClasses ?? item.class?.name) && (
              <span className="text-[11px] text-slate-500">
                {item.displayClasses ?? item.class?.name}
              </span>
            )}
            <span className="text-[11px] text-slate-400">
              {formatDateTime(item.startTime, locale)}
            </span>
          </div>
        </div>
      </td>

      <td className="px-4 py-3">
        {item.subject?.name ? (
          <Badge variant="secondary" size="sm" className="font-normal">
            {item.subject.name}
          </Badge>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>

      {role !== "student" && (
        <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">
          {item.displayClasses ?? item.class?.name ?? "—"}
        </td>
      )}

      {role !== "teacher" && (
        <td className="hidden md:table-cell px-4 py-3 text-slate-600 dark:text-slate-300">
          {item.teacher?.name ?? item.lesson?.teacher.name ?? "—"}
        </td>
      )}

      <td className="hidden md:table-cell px-4 py-3 text-slate-600 dark:text-slate-300 w-[180px] min-w-[180px]">
        {formatDateTime(item.startTime, locale)}
      </td>

      <td className="hidden md:table-cell px-4 py-3 text-slate-600 dark:text-slate-300 w-[180px] min-w-[180px]">
        {formatDateTime(item.endTime, locale)}
      </td>

      {role === "student" && (
        <td className="px-4 py-3">
          {(() => {
            if (!sub) {
              if (hasExamEnded) {
                return (
                  <Badge variant="secondary" size="sm">
                    Ended
                  </Badge>
                );
              }
              return (
                <Badge variant="outline" size="sm">
                  Not Started
                </Badge>
              );
            }
            if (
              sub.status === "IN_PROGRESS" &&
              (isTimerExpired || hasExamEnded)
            ) {
              return (
                <Badge variant="destructive" size="sm">
                  Ended
                </Badge>
              );
            }
            if (sub.status === "IN_PROGRESS") {
              return (
                <Badge variant="warning" size="sm">
                  In Progress
                </Badge>
              );
            }
            if (sub.status === "SUBMITTED") {
              return (
                <Badge variant="info" size="sm">
                  Submitted
                </Badge>
              );
            }
            if (sub.status === "GRADED" && !sub.gradePublished) {
              return (
                <Badge variant="warning" size="sm">
                  Graded
                </Badge>
              );
            }
            if (sub.status === "GRADED" && sub.gradePublished) {
              return (
                <Badge variant="success" size="sm">
                  Published
                </Badge>
              );
            }
            return null;
          })()}
        </td>
      )}

      {role === "student" && (
        <td className="px-4 py-3">
          {item.studentSubmission?.gradePublished &&
          item.studentSubmission.totalScore !== null ? (
            <Badge variant="primary" size="sm" className="font-bold">
              {item.studentSubmission.totalScore}/{maxScore}
            </Badge>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </td>
      )}

      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {(role === "admin" || role === "teacher") && (
            <>
              <Link
                href={`/list/exams/create-workflow?examId=${item.id}`}
                className="inline-flex justify-center items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs w-8 h-8 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:border-purple-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
                aria-label={actionsT ? actionsT("edit") : "Edit"}
                title={actionsT ? actionsT("edit") : "Edit"}
              >
                <Pencil className="w-4 h-4" />
              </Link>
              <FormContainer table="exam" type="delete" id={item.id} />
              <Link
                href={`/list/exams/${item.id}/submissions`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors text-xs font-medium"
              >
                <Users className="w-3.5 h-3.5" />
                Submissions
              </Link>
            </>
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
                <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium shadow-2xs transition">
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
  const actionsT = await getTranslations("actions");
  const locale = await getLocale();
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
            select: { id: true, name: true, gradeId: true },
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
    const groupKey = exam.groupId;

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
    const groupKey = exam.groupId;

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
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <DataPageHeader
        title={t("allExams")}
        count={count}
        actions={
          role === "admin" || role === "teacher" ? (
            <>
              {role === "admin" && (
                <ExportButton
                  href={`/api/admin/exams/export?${exportQuery.toString()}`}
                />
              )}
              <Link
                href="/list/exams/create-workflow"
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs md:text-sm font-medium rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-2xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
              >
                <Plus className="w-4 h-4" />
                {examT("addExam")}
              </Link>
            </>
          ) : undefined
        }
      />

      <DataPageToolbar
        search={<TableSearch />}
        filters={
          role === "admin" ? (
            <>
              <GradeFilter grades={grades} />
              <ClassFilter classes={classes} />
            </>
          ) : undefined
        }
        actions={<FilterSortActions sortKey="sort" />}
      />

      <Table
        columns={getColumns(role, th)}
        renderRow={(item) => renderRow(item, role, locale, actionsT)}
        data={dataWithClassDisplay}
        emptyTitle={examT("noExams")}
        emptyDescription={examT("emptyDescription")}
      />

      <Pagination page={p} count={count} />
    </div>
  );
};

export default ExamListPage;
