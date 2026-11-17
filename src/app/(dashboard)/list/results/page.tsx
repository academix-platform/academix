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
import { getTranslations } from "next-intl/server";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { buildResultQuery } from "@/lib/query-builders/result-query";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { UserRole } from "@/lib/utils";
import { Assignment, Exam, Result, Student } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import type { PageSearchParams } from "@/lib/pageParams";

type ResultList = Result & {
  student: Pick<Student, "name">;
  exam: Pick<Exam, "title"> | null;
  assignment: Pick<Assignment, "title"> | null;
};

const getColumns = (role: UserRole | null, th: (key: string) => string) => {
  const columns = [
    {
      header: th("assessment"),
      accessor: "assessment",
    },
    {
      header: th("score"),
      accessor: "score",
      className: "",
    },
  ];

  if (role !== "student") {
    columns.unshift({
      header: th("student"),
      accessor: "student",
    });
  }

  if (role === "admin" || role === "teacher") {
    columns.push({
      header: th("actions"),
      accessor: "action",
    });
  }

  return columns;
};

const renderRow = (item: ResultList, role: UserRole | null) => (
  <tr
    key={item.id}
    className="hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors text-xs md:text-sm"
  >
    {role !== "student" && (
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Image
            src="/avatar.png"
            alt=""
            width={32}
            height={32}
            className="rounded-full w-8 h-8 object-cover border border-slate-200 dark:border-slate-700 shrink-0"
          />
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
            {item.student.name}
          </span>
        </div>
      </td>
    )}

    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 font-medium">
      {item.exam?.title || item.assignment?.title || "—"}
    </td>

    <td className="px-4 py-3">
      <Badge variant="primary" size="md" className="font-bold">
        {item.score}
      </Badge>
    </td>

    {(role === "admin" || role === "teacher") && (
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <FormContainer table="result" type="update" data={item} />
          <FormContainer table="result" type="delete" id={item.id} />
        </div>
      </td>
    )}
  </tr>
);

const ResultListPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const t = await getTranslations("pages");
  const componentT = await getTranslations("gradeComponents");
  const th = await getTranslations("tableHeaders");
  const emptyT = await getTranslations("emptyStates");
  const { role, userId, schoolId } = await enforceRouteAccess("/list/results");

  const resolvedSearchParams = await searchParams;

  const {
    academicYearId,
    query,
    orderBy,
    page: p,
  } = await buildResultQuery({
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
    prisma.result.findMany({
      where: query,
      include: {
        student: {
          select: {
            name: true,
          },
        },
        exam: {
          select: {
            title: true,
          },
        },
        assignment: {
          select: {
            title: true,
          },
        },
      },
      orderBy,
      take: ITEM_PER_PAGE,
      skip: (p - 1) * ITEM_PER_PAGE,
    }),
    prisma.result.count({
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

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <DataPageHeader
        title={t("allResults")}
        count={count}
        actions={
          role === "admin" || role === "teacher" ? (
            <>
              {role === "admin" && (
                <ExportButton
                  href={`/api/admin/results/export?${exportQuery.toString()}`}
                />
              )}
              <Link
                href="/list/results/class-entry"
                className="bg-brandPurple-50 dark:bg-brandPurple-950/40 hover:bg-brandPurple-100 text-brandPurple-700 dark:text-brandPurple-400 px-3 py-2 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition border border-brandPurple-200 dark:border-brandPurple-900/50 shadow-2xs"
              >
                {t("enterClassMarks")}
              </Link>
              <Link
                href="/list/grade-components"
                className="bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 text-slate-700 dark:text-slate-300 px-3 py-2 rounded-xl text-xs md:text-sm font-semibold whitespace-nowrap transition border border-slate-200 dark:border-slate-700 shadow-2xs"
              >
                {componentT("manage")}
              </Link>
              <FormContainer table="result" type="create" />
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
        renderRow={(item) => renderRow(item, role)}
        data={data}
        emptyTitle={emptyT("results")}
        emptyDescription={emptyT("filterDescription")}
      />

      <Pagination page={p} count={count} />
    </div>
  );
};

export default ResultListPage;
