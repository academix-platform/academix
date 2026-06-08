import FilterSortActions from "@/components/FilterSortActions";
import FormContainer from "@/components/FormContainer";
import ClassFilter from "@/components/ClassFilter";
import GradeFilter from "@/components/GradeFilter";
import NoCurrentAcademicYearMessage from "@/components/NoCurrentAcademicYearMessage";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { getTranslations } from "next-intl/server";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { getCurrentAcademicYearIdOrNull } from "@/lib/academicYears";
import { Class, Event, Prisma } from "@prisma/client";
import { UserRole } from "@/lib/utils";

type EventList = Event & { classes: Pick<Class, "id" | "name">[] };

const getColumns = (role: UserRole | null, th: (key: string) => string) => [
  {
    header: th("title"),
    accessor: "title",
  },
  {
    header: th("class"),
    accessor: "class",
  },
  {
    header: th("date"),
    accessor: "date",
    className: "hidden md:table-cell",
  },
  {
    header: th("startTime"),
    accessor: "startTime",
    className: "hidden md:table-cell",
  },
  {
    header: th("endTime"),
    accessor: "endTime",
    className: "hidden md:table-cell",
  },
  {
    header: role === "admin" ? th("actions") : "",
    accessor: "action",
  },
];

const renderRow = (
  item: EventList,
  role: UserRole | null,
  totalClassesCount: number,
  allClassesLabel: string,
) => (
  <tr
    key={item.id}
    className="hover:bg-academixPurpleLight even:bg-slate-50 border-gray-200 border-b text-sm"
  >
    <td className="flex items-center gap-4 p-4">{item.title}</td>
    <td>
      {item.classes.length === totalClassesCount && totalClassesCount > 0
        ? allClassesLabel
        : item.classes.map((cls) => cls.name).join(", ") || "-"}
    </td>
    <td className="hidden md:table-cell">
      {new Intl.DateTimeFormat("en-US").format(item.startDate)}
    </td>
    <td className="hidden md:table-cell">
      {item.startDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })}
    </td>
    <td className="hidden md:table-cell">
      {" "}
      {item.endDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })}
    </td>
    <td>
      <div className="flex items-center gap-2">
        {role === "admin" && (
          <>
            <FormContainer table="event" type="update" data={item} />
            <FormContainer table="event" type="delete" id={item.id} />
          </>
        )}
      </div>
    </td>
  </tr>
);
const EventListPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const t = await getTranslations("pages");
  const th = await getTranslations("tableHeaders");
  const filtersT = await getTranslations("filters");
  const emptyT = await getTranslations("emptyStates");
  const { role, userId, schoolId } = await enforceRouteAccess("/list/events");
  const resolvedSearchParams = await searchParams;
  const { page, ...queryParams } = resolvedSearchParams;
  const currentPage = getQueryParam(page);
  const p = currentPage ? parseInt(currentPage) : 1;
  const academicYearId = await getCurrentAcademicYearIdOrNull(schoolId);

  if (!academicYearId) {
    return <NoCurrentAcademicYearMessage />;
  }

  const query: Prisma.EventWhereInput = { schoolId, academicYearId };
  const conditions: Prisma.EventWhereInput[] = [];
  if (queryParams) {
    for (const [key, rawValue] of Object.entries(queryParams)) {
      const value = getQueryParam(rawValue);
      if (value !== undefined) {
        switch (key) {
          case "search": {
            conditions.push({
              title: { contains: value, mode: "insensitive" },
            });
            break;
          }
          case "classId": {
            const classId = Number.parseInt(value, 10);
            if (!Number.isNaN(classId)) {
              conditions.push({
                classes: { some: { id: classId } },
              });
            }
            break;
          }
          case "gradeId": {
            const gradeId = Number.parseInt(value, 10);
            if (!Number.isNaN(gradeId)) {
              conditions.push({
                classes: { some: { gradeId } },
              });
            }
            break;
          }
          default:
            break;
        }
      }
    }
  }

  // ROLE CONDITIONS
  if (role !== "admin") {
    if (!userId) throw new Error("Unauthorized");

    const roleConditions = {
      teacher: { lessons: { some: { teacherId: userId } } },
      student: { students: { some: { id: userId } } },
      parent: { students: { some: { parentId: userId } } },
    };

    const condition = roleConditions[role as keyof typeof roleConditions];

    if (!condition) throw new Error("Invalid role");

    conditions.push({
      classes: {
        some: condition,
      },
    });
  }

  if (conditions.length > 0) {
    query.AND = conditions;
  }

  const sortParam = getQueryParam(queryParams.sort);
  const orderBy: Prisma.EventOrderByWithRelationInput =
    sortParam === "asc" ? { startDate: "asc" } : { startDate: "desc" };

  const [data, count, totalClassesCount, classes, grades] = await prisma.$transaction([
    prisma.event.findMany({
      where: query,
      include: {
        classes: { select: { id: true, name: true } },
      },
      orderBy,
      take: ITEM_PER_PAGE,
      skip: (p - 1) * ITEM_PER_PAGE,
    }),
    prisma.event.count({
      where: query,
    }),
    prisma.class.count({ where: { schoolId } }),
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
  ]);

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      {/* TOP */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="font-semibold text-lg">{t("allEvents")}</h1>
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
            {role === "admin" && <FormContainer table="event" type="create" />}
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table
        columns={getColumns(role, th)}
        renderRow={(item) =>
          renderRow(item, role, totalClassesCount, filtersT("allClasses"))
        }
        data={data}
        emptyTitle={emptyT("events")}
        emptyDescription={emptyT("filterDescription")}
      />
      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default EventListPage;
