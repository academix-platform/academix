import ExportButton from "@/components/ExportButton";
import FilterSortActions from "@/components/FilterSortActions";
import FormContainer from "@/components/FormContainer";
import PromoteStudentsButton from "@/components/PromoteStudentsButton";
import ImportButton from "@/components/peopleImport/ImportButton";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { DataPageHeader, DataPageToolbar } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { getTranslations } from "next-intl/server";
import { getCurrentAcademicYearOrNull } from "@/lib/academicYears";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import {
  buildStudentQuery,
  missingNationalIdWhere,
} from "@/lib/query-builders/student-query";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Class, Student } from "@prisma/client";
import { Eye, IdCard } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import NoCurrentAcademicYearMessage from "@/components/NoCurrentAcademicYearMessage";
import { UserRole } from "@/lib/utils";
import type { PageSearchParams } from "@/lib/pageParams";
import GradeFilter from "@/components/GradeFilter";
import ClassFilter from "@/components/ClassFilter";

type StudentList = Student & { class: Class };

const getColumns = (role: UserRole | null, th: (key: string) => string) => [
  { header: th("info"), accessor: "info" },
  {
    header: th("studentId"),
    accessor: "studentId",
    className: "hidden md:table-cell",
  },
  {
    header: th("grade"),
    accessor: "grade",
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

const renderRow = (item: StudentList, role: UserRole | null) => (
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
          {/* Mobile-only secondary info: class & phone */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1 md:hidden">
            <Badge
              variant="secondary"
              size="sm"
              className="text-[10px] py-0 px-1.5 font-normal"
            >
              {item.class.name}
            </Badge>
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
      <Badge variant="primary" size="sm" className="font-normal">
        {item.class.name}
      </Badge>
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
          href={`/list/students/${item.id}`}
          aria-label="View student details"
          className="inline-flex justify-center items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs w-8 h-8 text-purple-700 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:border-purple-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
        >
          <Eye className="w-4 h-4" />
        </Link>

        {role === "admin" && (
          <FormContainer table="student" type="delete" id={item.id} />
        )}
      </div>
    </td>
  </tr>
);

// The import dialog's server actions run under this page's limit, and reading
// a 10-page PDF can take most of a minute.
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#maxduration
export const maxDuration = 60;

const StudentListPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const t = await getTranslations("pages");
  const th = await getTranslations("tableHeaders");
  const emptyT = await getTranslations("emptyStates");
  const { role, userId, schoolId } = await enforceRouteAccess("/list/students");

  const currentAcademicYear = await getCurrentAcademicYearOrNull(schoolId);
  const academicYearId = currentAcademicYear?.id ?? null;

  if (!academicYearId || !currentAcademicYear) {
    return <NoCurrentAcademicYearMessage role={role} />;
  }

  const {
    query,
    orderBy,
    page: p,
    missingNationalIdOnly,
  } = await buildStudentQuery({
    searchParams,
    schoolId,
    currentAcademicYearId: academicYearId,
    role,
    userId,
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

  exportQuery.set("academicYearId", String(academicYearId));

  // Admins see how many students still need a national ID, and can list them.
  const missingNationalIdCount =
    role === "admin"
      ? await prisma.student.count({ where: missingNationalIdWhere(query) })
      : 0;

  const missingNationalIdQuery = new URLSearchParams(exportQuery);
  missingNationalIdQuery.delete("academicYearId");
  missingNationalIdQuery.delete("page");
  if (missingNationalIdOnly) {
    missingNationalIdQuery.delete("missingNationalId");
  } else {
    missingNationalIdQuery.set("missingNationalId", "1");
  }

  const classWhere =
    role === "teacher"
      ? {
          schoolId,
          OR: [
            { teachers: { some: { id: userId } } },
            { lessons: { some: { teacherId: userId } } },
          ],
        }
      : { schoolId };

  const classes = await prisma.class.findMany({
    where: classWhere,
    select: {
      id: true,
      name: true,
      gradeId: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const teacherGradeIds =
    role === "teacher"
      ? Array.from(new Set(classes.map((classItem) => classItem.gradeId)))
      : [];

  const grades = await prisma.grade.findMany({
    where: {
      schoolId,
      ...(role === "teacher" ? { id: { in: teacherGradeIds } } : {}),
    },
    select: {
      id: true,
      level: true,
    },
    orderBy: {
      level: "asc",
    },
  });

  const [data, count] = await prisma.$transaction([
    prisma.student.findMany({
      where: query,
      include: {
        class: true,
      },
      orderBy,
      take: ITEM_PER_PAGE,
      skip: (p - 1) * ITEM_PER_PAGE,
    }),
    prisma.student.count({
      where: query,
    }),
  ]);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <DataPageHeader
        title={t("allStudents")}
        count={count}
        actions={
          role === "admin" ? (
            <>
              <ExportButton
                href={`/api/admin/students/export?${exportQuery.toString()}`}
              />
              <ImportButton kind="students" />
              <PromoteStudentsButton
                academicYearName={currentAcademicYear.name}
                academicYearEndDate={currentAcademicYear.endDate}
              />
              <FormContainer table="student" type="create" />
            </>
          ) : undefined
        }
      />

      <DataPageToolbar
        search={<TableSearch />}
        filters={
          <>
            <GradeFilter grades={grades} />
            <ClassFilter classes={classes} />
            {role === "admin" && (missingNationalIdCount > 0 || missingNationalIdOnly) && (
              <Link
                href={`?${missingNationalIdQuery.toString()}`}
                aria-current={missingNationalIdOnly ? "true" : undefined}
                className={`inline-flex items-center gap-2 h-9 rounded-lg border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600 ${
                  missingNationalIdOnly
                    ? "border-purple-700 bg-purple-700 text-white"
                    : "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
                }`}
              >
                <IdCard className="w-4 h-4" aria-hidden="true" />
                {missingNationalIdOnly
                  ? t("showAllStudents")
                  : t("missingNationalId", { count: missingNationalIdCount })}
              </Link>
            )}
          </>
        }
        actions={<FilterSortActions sortKey="sort" />}
      />

      <Table
        columns={getColumns(role, th)}
        renderRow={(item) => renderRow(item, role)}
        data={data}
        emptyTitle={emptyT("students")}
        emptyDescription={emptyT("filterDescription")}
      />

      <Pagination page={p} count={count} />
    </div>
  );
};

export default StudentListPage;
