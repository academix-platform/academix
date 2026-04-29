import FilterSortActions from "@/components/FilterSortActions";
import FormContainer from "@/components/FormContainer";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { type UserRole } from "@/lib/auth";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { Prisma, Subject, Teacher } from "@prisma/client";
import { Eye } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

type TeacherList = Teacher & {
  subjects: Subject[];
};

const getColumns = (role: UserRole | null) => [
  {
    header: "Info",
    accessor: "info",
  },
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
        <p className="text-gray-500 text-xs">{item?.email}</p>
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
          <button className="flex justify-center items-center bg-academixSky rounded-full w-7 h-7">
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

  const resolvedSearchParams = await searchParams;
  const { page, ...queryParams } = resolvedSearchParams;
  const currentPage = getQueryParam(page);
  const p = currentPage ? parseInt(currentPage) : 1;

  const query: Prisma.TeacherWhereInput = { schoolId };
  const conditions: Prisma.TeacherWhereInput[] = [];
  if (queryParams) {
    for (const [key, rawValue] of Object.entries(queryParams)) {
      const value = getQueryParam(rawValue);

      if (value !== undefined) {
        switch (key) {
          case "classId":
            conditions.push({
              lessons: {
                some: {
                  classId: parseInt(value),
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

  if (conditions.length > 0) {
    query.AND = conditions;
  }

  const [data, count] = await prisma.$transaction([
    prisma.teacher.findMany({
      where: query,
      include: {
        subjects: true,
      },
      orderBy: { name: "asc" },
      take: ITEM_PER_PAGE,
      skip: (p - 1) * ITEM_PER_PAGE,
    }),
    prisma.teacher.count({
      where: query,
    }),
  ]);

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      {/* TOP */}
      <div className="flex justify-between items-center">
        <h1 className="hidden md:block font-semibold text-lg">All Teachers</h1>
        <div className="flex md:flex-row flex-col items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center self-end gap-4">
            <FilterSortActions />
            {role === "admin" && (
              <FormContainer table="teacher" type="create" />
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

export default TeacherListPage;
