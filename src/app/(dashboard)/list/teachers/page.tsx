import ExportButton from "@/components/ExportButton";
import FilterSortActions from "@/components/FilterSortActions";
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
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

const getColumns = (role: UserRole | null) => [
  { header: "Info", accessor: "info" },
  {
    header: "Teacher ID",
    accessor: "teacherId",
    className: "hidden md:table-cell",
  },
  {
    header: "Subjects",
    accessor: "subjects",
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

const renderRow = (item: TeacherList, role: UserRole | null) => (
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
        <p className="text-gray-500 text-xs">{item.email}</p>
      </div>
    </td>

    <td className="hidden md:table-cell">{item.username}</td>

    <td className="hidden md:table-cell">
      {item.subjects.map((subject) => subject.name).join(", ")}
    </td>

    <td className="hidden md:table-cell">{item.phone}</td>
    <td className="hidden md:table-cell">{item.address}</td>

    <td>
      <div className="flex items-center gap-2">
        <Link href={`/list/teachers/${item.id}`}>
          <button className="flex justify-center items-center bg-academixPurpleDark p-2 rounded-md w-8 h-8 text-white hover:scale-[1.05] transition">
            {" "}
            <Eye className="w-4 h-4" />
          </button>
        </Link>

        {role === "admin" && (
          <FormContainer table="teacher" type="delete" id={item.id} />
        )}
      </div>
    </td>
  </tr>
);

const TeacherListPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
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
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="font-semibold text-lg">All Teachers</h1>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
         <SubjectFilter subjects={subjects} />
         <ClassFilter classes={classes} />
          <TableSearch />

          <div className="flex items-center self-end gap-2">
            <FilterSortActions sortKey="sort" />

            {role === "admin" && (
              <>
                <ExportButton
                  href={`/api/admin/teachers/export?${exportQuery.toString()}`}
                />

                <FormContainer table="teacher" type="create" />
              </>
            )}
          </div>
        </div>
      </div>

      <Table
        columns={getColumns(role)}
        renderRow={(item) => renderRow(item, role)}
        data={data}
        emptyTitle="No teachers found"
        emptyDescription="Try changing your filters or search terms."
      />

      <Pagination page={p} count={count} />
    </div>
  );
};

export default TeacherListPage;
