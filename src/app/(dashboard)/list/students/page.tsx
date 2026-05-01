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
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Class, Prisma, Student, StudentStatus } from "@prisma/client";
import { Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import NoCurrentAcademicYearMessage from "@/components/NoCurrentAcademicYearMessage";
import { UserRole } from "@/lib/utils";

type StudentList = Student & { class: Class };

const getColumns = (role: UserRole | null) => [
  {
    header: "Info",
    accessor: "info",
  },
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
          <button className="flex justify-center items-center bg-academixSky rounded-full w-7 h-7">
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

  const resolvedSearchParams = await searchParams;
  const { page, ...queryParams } = resolvedSearchParams;
  const currentPage = getQueryParam(page);
  const p = currentPage ? parseInt(currentPage) : 1;

  const academicYearParam = getQueryParam(queryParams.academicYearId);
  const statusParam = getQueryParam(queryParams.status);
  const repeatCountParam = getQueryParam(queryParams.repeatCount);
  const selectedAcademicYearId = academicYearParam
    ? Number.parseInt(academicYearParam, 10)
    : academicYearId;

  const validStatuses: StudentStatus[] = [
    "ACTIVE",
    "REPEATED",
    "GRADUATED",
    "LEFT",
  ];
  const selectedStatus = validStatuses.includes(statusParam as StudentStatus)
    ? (statusParam as StudentStatus)
    : "ACTIVE";

  const selectedRepeatCount =
    repeatCountParam && selectedStatus === "REPEATED"
      ? Number.parseInt(repeatCountParam, 10)
      : 1;

  const query: Prisma.StudentWhereInput = {
    schoolId,
    academicYears: {
      some: {
        academicYearId: selectedAcademicYearId,
      },
    },
    status: selectedStatus,
  };

  const conditions: Prisma.StudentWhereInput[] = [];

  if (selectedStatus === "REPEATED") {
    query.repeatCount = Number.isNaN(selectedRepeatCount)
      ? 1
      : selectedRepeatCount;
  }

  if (queryParams) {
    for (const [key, rawValue] of Object.entries(queryParams)) {
      const value = getQueryParam(rawValue);

      if (value !== undefined) {
        switch (key) {
          case "teacherId":
            conditions.push({
              class: {
                lessons: {
                  some: { teacherId: value },
                },
              },
            });
            break;

          case "search":
            conditions.push({
              name: { contains: value, mode: "insensitive" },
            });
            break;
        }
      }
    }
  }

  switch (role) {
    case "admin":
      break;

    case "teacher":
      conditions.push({
        class: {
          lessons: {
            some: { teacherId: userId },
          },
        },
      });
      break;
  }

  if (conditions.length > 0) {
    query.AND = conditions;
  }

  const [data, count] = await prisma.$transaction([
    prisma.student.findMany({
      where: query,
      include: {
        class: true,
      },
      orderBy: { name: "asc" },
      take: ITEM_PER_PAGE,
      skip: (p - 1) * ITEM_PER_PAGE,
    }),
    prisma.student.count({
      where: query,
    }),
  ]);

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      {/* TOP */}
      <div className="flex justify-between items-center">
        <h1 className="hidden md:block font-semibold text-lg">All Students</h1>
        <div className="flex md:flex-row flex-col items-center gap-4 w-full md:w-auto">
          <TableSearch />
          {role === "admin" && (
            <StudentsFilters
              academicYears={academicYears}
              currentAcademicYearId={academicYearId}
            />
          )}
          <div className="flex items-center self-end gap-4">
            {role === "admin" && (
              <>
                <PromoteStudentsButton
                  academicYearName={currentAcademicYear.name}
                  academicYearEndDate={currentAcademicYear.endDate}
                />
                <FormContainer table="student" type="create" />
              </>
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

export default StudentListPage;
