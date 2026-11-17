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
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import {
  getCurrentAcademicYearOrNull,
  semesterAndAnnualWhere,
} from "@/lib/academicYears";
import { Announcement, Class, Prisma } from "@prisma/client";
import { UserRole } from "@/lib/utils";

type AnnouncementList = Announcement & {
  classes: Pick<Class, "id" | "name">[];
};

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
    header: role === "admin" ? th("actions") : "",
    accessor: "action",
  },
];

const renderRow = (
  item: AnnouncementList,
  role: UserRole | null,
  totalClassesCount: number,
  allClassesLabel: string,
  locale: string = "en",
) => (
  <tr
    key={item.id}
    className="hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors text-xs md:text-sm"
  >
    <td className="px-4 py-3">
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
          {item.title}
        </span>
        {/* Mobile secondary info: date */}
        <span className="text-[11px] text-slate-400 md:hidden">
          {new Intl.DateTimeFormat(locale).format(item.date)}
        </span>
      </div>
    </td>

    <td className="px-4 py-3">
      {item.classes.length === totalClassesCount && totalClassesCount > 0 ? (
        <Badge variant="primary" size="sm" className="font-normal">
          {allClassesLabel}
        </Badge>
      ) : item.classes.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1">
          {item.classes.map((cls) => (
            <Badge
              key={cls.id}
              variant="secondary"
              size="sm"
              className="font-normal"
            >
              {cls.name}
            </Badge>
          ))}
        </div>
      ) : (
        <span className="text-slate-400">—</span>
      )}
    </td>

    <td className="hidden md:table-cell px-4 py-3 text-slate-600 dark:text-slate-300">
      {new Intl.DateTimeFormat(locale).format(item.date)}
    </td>

    <td className="px-4 py-3">
      <div className="flex items-center gap-1.5">
        {role === "admin" && (
          <>
            <FormContainer table="announcement" type="update" data={item} />
            <FormContainer table="announcement" type="delete" id={item.id} />
          </>
        )}
      </div>
    </td>
  </tr>
);

const AnnouncementListPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const t = await getTranslations("pages");
  const th = await getTranslations("tableHeaders");
  const filtersT = await getTranslations("filters");
  const emptyT = await getTranslations("emptyStates");
  const locale = await getLocale();
  const { role, userId, schoolId } = await enforceRouteAccess(
    "/list/announcements",
  );
  const resolvedSearchParams = await searchParams;
  const { page, ...queryParams } = resolvedSearchParams;
  const currentPage = getQueryParam(page);
  const p = currentPage ? parseInt(currentPage) : 1;
  const academicYear = await getCurrentAcademicYearOrNull(schoolId);

  if (!academicYear) {
    return <NoCurrentAcademicYearMessage />;
  }

  const query: Prisma.AnnouncementWhereInput = {
    schoolId,
    academicYearId: academicYear.id,
    ...semesterAndAnnualWhere(academicYear.currentSemester),
  };
  const conditions: Prisma.AnnouncementWhereInput[] = [];
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

  if (role !== "admin") {
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
  const orderBy: Prisma.AnnouncementOrderByWithRelationInput =
    sortParam === "asc" ? { date: "asc" } : { date: "desc" };

  const [data, count, totalClassesCount, classes, grades] =
    await prisma.$transaction([
      prisma.announcement.findMany({
        where: query,
        include: {
          classes: { select: { id: true, name: true } },
        },
        orderBy,
        take: ITEM_PER_PAGE,
        skip: (p - 1) * ITEM_PER_PAGE,
      }),
      prisma.announcement.count({ where: query }),
      prisma.class.count({ where: { schoolId } }),
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
    ]);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <DataPageHeader
        title={t("allAnnouncements")}
        count={count}
        actions={
          role === "admin" ? (
            <FormContainer table="announcement" type="create" />
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
        renderRow={(item) =>
          renderRow(item, role, totalClassesCount, filtersT("allClasses"), locale)
        }
        data={data}
        emptyTitle={emptyT("announcements")}
        emptyDescription={emptyT("filterDescription")}
      />

      <Pagination page={p} count={count} />
    </div>
  );
};

export default AnnouncementListPage;
