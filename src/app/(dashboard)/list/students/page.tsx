import ExportButton from "@/components/ExportButton";
import FilterSortActions from "@/components/FilterSortActions";
import FormContainer from "@/components/FormContainer";
import PromoteStudentsButton from "@/components/PromoteStudentsButton";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { getTranslations } from "next-intl/server";
import { getCurrentAcademicYearOrNull } from "@/lib/academicYears";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { buildStudentQuery } from "@/lib/query-builders/student-query";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Class, Student } from "@prisma/client";
import { Eye } from "lucide-react";
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
    className="hover:bg-academixPurpleLight even:bg-slate-50 border-gray-200 border-b text-sm"
  >
    <td className="flex items-center gap-4 p-4">
      <Image
        src={item.img || "/avatar.png"}
        alt=""
        width={40}
        height={40}
        className="md:hidden xl:block rounded-full w-10 h-10 object-cover"
      />
      <div className="flex flex-col">
        <h3 className="font-semibold">{item.name}</h3>
        <p className="text-gray-500 text-xs">{item.class.name}</p>
      </div>
    </td>

    <td className="hidden md:table-cell">{item.username}</td>
    <td className="hidden md:table-cell">{item.class.name[0]}</td>
    <td className="hidden md:table-cell">{item.phone}</td>
    <td className="hidden md:table-cell">{item.address}</td>

    <td>
      <div className="flex items-center gap-2">
        <Link href={`/list/students/${item.id}`}>
          <button className="flex justify-center items-center bg-academixPurpleDark p-2 rounded-md w-8 h-8 text-white hover:scale-[1.05] transition">
            {" "}
            <Eye className="w-4 h-4" />
          </button>
        </Link>

        {role === "admin" && (
          <FormContainer table="student" type="delete" id={item.id} />
        )}
      </div>
    </td>
  </tr>
);

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

  const classes = await prisma.class.findMany({
    where: {
      schoolId,
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const grades = await prisma.grade.findMany({
    where: {
      schoolId,
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
  <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">

    {/* HEADER */}
    <div className="flex flex-col gap-4">

      {/* TOP ROW */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-semibold text-lg">{t("allStudents")}</h1>

        <div className="flex flex-wrap items-center gap-2">
          <TableSearch />

          <FilterSortActions />

          {role === "admin" && (
            <>
              <ExportButton
                href={`/api/admin/students/export?${exportQuery.toString()}`}
              />

              <FormContainer table="student" type="create" />
            </>
          )}
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex flex-wrap items-end gap-2">

  <GradeFilter grades={grades} />

  <ClassFilter classes={classes} />

</div>
    </div>

    {/* TABLE */}
    <Table
      columns={getColumns(role, th)}
      renderRow={(item) => renderRow(item, role)}
      data={data}
      emptyTitle={emptyT("students")}
      emptyDescription={emptyT("filterDescription")}
    />

    {/* PAGINATION */}
    <div className="flex justify-between items-center">
      {role === "admin" && (
        <PromoteStudentsButton
          academicYearName={currentAcademicYear.name}
          academicYearEndDate={currentAcademicYear.endDate}
        />
      )}

      <Pagination page={p} count={count} />
    </div>
  </div>
);
};

export default StudentListPage;
