import ExportButton from "@/components/ExportButton";
import FilterSortActions from "@/components/FilterSortActions";
import FormContainer from "@/components/FormContainer";
import PromoteStudentsButton from "@/components/PromoteStudentsButton";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import StudentsFilters from "@/components/StudentsFilters";
import {
  getAcademicYears,
  getCurrentAcademicYearOrNull,
} from "@/lib/academicYears";
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

type StudentList = Student & { class: Class };

const getColumns = (role: UserRole | null) => [
  { header: "Info", accessor: "info" },
  {
    header: "Student ID",
    accessor: "studentId",
    className: "hidden md:table-cell",
  },
  {
    header: "Grade",
    accessor: "grade",
    className: "hidden md:table-cell",
  },
  {
    header: "Phone",
    accessor: "phone",
    className: "hidden lg:table-cell",
  },
  {
    header: "Address",
    accessor: "address",
    className: "hidden lg:table-cell",
  },
  {
    header: role === "admin" ? "Actions" : "",
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
  const { role, userId, schoolId } = await enforceRouteAccess("/list/students");

  const currentAcademicYear = await getCurrentAcademicYearOrNull(schoolId);
  const academicYearId = currentAcademicYear?.id ?? null;

  const academicYears =
    role === "admin" ? await getAcademicYears(schoolId) : [];

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

  if (!exportQuery.get("academicYearId")) {
    exportQuery.set("academicYearId", String(academicYearId));
  }

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
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <h1 className="font-semibold text-lg">All Students</h1>

          {role === "admin" && (
            <StudentsFilters
              academicYears={academicYears}
              currentAcademicYearId={academicYearId}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center gap-2">
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
      </div>

      <Table
        columns={getColumns(role)}
        renderRow={(item) => renderRow(item, role)}
        data={data}
      />
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
