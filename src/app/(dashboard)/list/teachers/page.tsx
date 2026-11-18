import ExportButton from "@/components/ExportButton";
import FilterSortActions from "@/components/FilterSortActions";
import FormContainer from "@/components/FormContainer";
import ImportButton from "@/components/peopleImport/ImportButton";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { DataPageHeader, DataPageToolbar } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { getTranslations } from "next-intl/server";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { buildTeacherQuery } from "@/lib/query-builders/teacher-query";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { UserRole } from "@/lib/utils";
import { Subject, Teacher } from "@prisma/client";
import { Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { PageSearchParams } from "@/lib/pageParams";
import SubjectFilter from "@/components/SubjectFilter";
import ClassFilter from "@/components/ClassFilter";

type TeacherList = Teacher & {
  subjects: Subject[];
};

const getColumns = (role: UserRole | null, th: (key: string) => string) => [
  { header: th("info"), accessor: "info" },
  {
    header: th("teacherId"),
    accessor: "teacherId",
    className: "hidden md:table-cell",
  },
  {
    header: th("subjects"),
    accessor: "subjects",
    className: "hidden md:table-cell",
  },
  {
    header: th("phone"),
    accessor: "phone",
    className: "hidden lg:table-cell",
  },
  {
    header: th("address"),
    accessor: "address",
    className: "hidden lg:table-cell",
  },
  {
    header: role === "admin" ? th("actions") : "",
    accessor: "action",
  },
];

const renderRow = (item: TeacherList, role: UserRole | null) => (
  <tr
    key={item.id}
    className="hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors text-xs md:text-sm"
  >
    <td className="px-4 py-3">
      <div className="flex items-center gap-3">
        <Image
          src={item.img || "/avatar.png"}
          alt=""
          width={40}
          height={40}
          className="rounded-full w-10 h-10 object-cover border border-slate-200 dark:border-slate-700 shrink-0"
        />
        <div className="flex flex-col gap-0.5 min-w-0">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">
            {item.name}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
            {item.email || item.username}
          </p>
          {/* Mobile-only secondary info: subjects badges & phone */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1 md:hidden">
            {item.subjects.slice(0, 2).map((s) => (
              <Badge
                key={s.id}
                variant="primary"
                size="sm"
                className="text-[10px] py-0 px-1.5 font-normal"
              >
                {s.name}
              </Badge>
            ))}
            {item.subjects.length > 2 && (
              <span className="text-[10px] text-slate-400">
                +{item.subjects.length - 2}
              </span>
            )}
            {item.phone && (
              <span className="text-[11px] text-slate-500 ps-1">
                {item.phone}
              </span>
            )}
          </div>
        </div>
      </div>
    </td>

    <td className="hidden md:table-cell px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
      {item.username}
    </td>

    <td className="hidden md:table-cell px-4 py-3">
      <div className="flex flex-wrap items-center gap-1">
        {item.subjects.length > 0 ? (
          item.subjects.map((subject) => (
            <Badge
              key={subject.id}
              variant="primary"
              size="sm"
              className="font-normal"
            >
              {subject.name}
            </Badge>
          ))
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </div>
    </td>

    <td className="hidden lg:table-cell px-4 py-3 text-slate-600 dark:text-slate-300">
      {item.phone || "—"}
    </td>

    <td className="hidden lg:table-cell px-4 py-3 text-slate-600 dark:text-slate-300 max-w-[200px] truncate">
      {item.address || "—"}
    </td>

    <td className="px-4 py-3">
      <div className="flex items-center gap-1.5">
        <Link
          href={`/list/teachers/${item.id}`}
          aria-label="View teacher details"
          className="inline-flex justify-center items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs w-8 h-8 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:border-purple-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
        >
          <Eye className="w-4 h-4" />
        </Link>

        {role === "admin" && (
          <FormContainer table="teacher" type="delete" id={item.id} />
        )}
      </div>
    </td>
  </tr>
);

// The import dialog's server actions run under this page's limit, and reading
// a 10-page PDF can take most of a minute.
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#maxduration
export const maxDuration = 60;

const TeacherListPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const t = await getTranslations("pages");
  const th = await getTranslations("tableHeaders");
  const emptyT = await getTranslations("emptyStates");
  const { role, schoolId } = await enforceRouteAccess("/list/teachers");

  const {
    query,
    orderBy,
    page: p,
  } = await buildTeacherQuery({
    searchParams,
    schoolId,
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

  const subjects = await prisma.subject.findMany({
    where: {
      schoolId,
    },
    select: {
      id: true,
      name: true,
      gradeId: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const classes = await prisma.class.findMany({
    where: {
      schoolId,
    },
    select: {
      id: true,
      name: true,
      gradeId: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const [data, count] = await prisma.$transaction([
    prisma.teacher.findMany({
      where: query,
      include: {
        subjects: true,
      },
      orderBy,
      take: ITEM_PER_PAGE,
      skip: (p - 1) * ITEM_PER_PAGE,
    }),
    prisma.teacher.count({
      where: query,
    }),
  ]);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <DataPageHeader
        title={t("allTeachers")}
        count={count}
        actions={
          role === "admin" ? (
            <>
              <ExportButton
                href={`/api/admin/teachers/export?${exportQuery.toString()}`}
              />
              <ImportButton kind="teachers" />
              <FormContainer table="teacher" type="create" />
            </>
          ) : undefined
        }
      />

      <DataPageToolbar
        search={<TableSearch />}
        filters={
          <>
            <SubjectFilter subjects={subjects} classes={classes} />
            <ClassFilter classes={classes} />
          </>
        }
        actions={<FilterSortActions sortKey="sort" />}
      />

      <Table
        columns={getColumns(role, th)}
        renderRow={(item) => renderRow(item, role)}
        data={data}
        emptyTitle={emptyT("teachers")}
        emptyDescription={emptyT("filterDescription")}
      />

      <Pagination page={p} count={count} />
    </div>
  );
};

export default TeacherListPage;
