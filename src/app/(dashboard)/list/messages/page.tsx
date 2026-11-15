import FilterSortActions from "@/components/FilterSortActions";
import FormContainer from "@/components/FormContainer";
import MessageViewModal from "@/components/MessageViewModal";
import NoCurrentAcademicYearMessage from "@/components/NoCurrentAcademicYearMessage";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { DataPageHeader, DataPageToolbar } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { getCurrentAcademicYearIdOrNull } from "@/lib/academicYears";
import { Prisma } from "@prisma/client";
import {
  getDescriptionPreview,
  getRecipientsPreview,
  MessageList,
} from "@/lib/message";
import { UserRole } from "@/lib/utils";
import { getLocale, getTranslations } from "next-intl/server";

const isLimitedMessageRole = (role: UserRole | null) =>
  role === "student" || role === "parent" || role === "teacher";

const getColumns = (role: UserRole | null, th: (key: string) => string) => {
  if (isLimitedMessageRole(role)) {
    return [
      {
        header: th("title"),
        accessor: "title",
      },
      {
        header: th("content"),
        accessor: "description",
        className: "hidden md:table-cell",
      },
      {
        header: th("date"),
        accessor: "date",
        className: "hidden sm:table-cell",
      },
      {
        header: th("time"),
        accessor: "time",
        className: "hidden md:table-cell",
      },
      {
        header: th("actions"),
        accessor: "action",
      },
    ];
  }

  return [
    {
      header: th("title"),
      accessor: "title",
    },
    {
      header: th("content"),
      accessor: "description",
      className: "hidden lg:table-cell",
    },
    {
      header: th("sentTo"),
      accessor: "recipients",
      className: "hidden md:table-cell",
    },
    {
      header: th("class"),
      accessor: "class",
      className: "hidden sm:table-cell",
    },
    {
      header: th("date"),
      accessor: "date",
      className: "hidden md:table-cell",
    },
    {
      header: th("time"),
      accessor: "time",
      className: "hidden md:table-cell",
    },
    {
      header: role === "admin" ? th("actions") : "",
      accessor: "action",
    },
  ];
};

const renderRow = (
  item: MessageList,
  role: UserRole | null,
  totalClassesCount: number,
  allClassesLabel: string,
  locale: string = "ar",
) => {
  if (isLimitedMessageRole(role)) {
    return (
      <tr
        key={item.id}
        className="hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors text-xs md:text-sm"
      >
        <td className="px-4 py-3">
          <div className="flex flex-col gap-0.5">
            <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              {item.title}
            </span>
            {/* Mobile secondary info */}
            <div className="flex flex-col gap-0.5 mt-0.5 md:hidden text-xs text-slate-500 dark:text-slate-400">
              <span className="truncate max-w-[240px]">
                {getDescriptionPreview(item.description)}
              </span>
              <span className="text-[11px] text-slate-400">
                {new Intl.DateTimeFormat(locale).format(item.date)}
              </span>
            </div>
          </div>
        </td>
        <td className="hidden md:table-cell px-4 py-3 text-slate-600 dark:text-slate-300 max-w-[260px] truncate">
          {getDescriptionPreview(item.description)}
        </td>
        <td className="hidden sm:table-cell px-4 py-3 text-slate-600 dark:text-slate-300">
          {new Intl.DateTimeFormat(locale).format(item.date)}
        </td>
        <td className="hidden md:table-cell px-4 py-3 text-slate-600 dark:text-slate-300">
          {item.date.toLocaleTimeString(locale, {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            <MessageViewModal message={item} />
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr
      key={item.id}
      className="hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors text-xs md:text-sm"
    >
      <td className="px-4 py-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
            {item.title}
          </span>
          {/* Mobile secondary info */}
          <div className="flex flex-col gap-0.5 mt-0.5 md:hidden text-xs text-slate-500 dark:text-slate-400">
            <span className="truncate max-w-[240px]">
              {getDescriptionPreview(item.description)}
            </span>
            <span className="text-[11px] text-slate-400">
              {new Intl.DateTimeFormat(locale).format(item.date)}
            </span>
          </div>
        </div>
      </td>
      <td className="hidden lg:table-cell px-4 py-3 text-slate-600 dark:text-slate-300 max-w-[260px] truncate">
        {getDescriptionPreview(item.description)}
      </td>
      <td className="hidden md:table-cell px-4 py-3">
        <Badge variant="secondary" size="sm" className="font-normal">
          {getRecipientsPreview(item)}
        </Badge>
      </td>
      <td className="hidden sm:table-cell px-4 py-3">
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
      <td className="hidden md:table-cell px-4 py-3 text-slate-600 dark:text-slate-300">
        {item.date.toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <MessageViewModal message={item} />
          {role === "admin" && (
            <>
              <FormContainer table="message" type="update" data={item} />
              <FormContainer table="message" type="delete" id={item.id} />
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

const MessageListPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const t = await getTranslations("pages");
  const th = await getTranslations("tableHeaders");
  const filtersT = await getTranslations("filters");
  const emptyT = await getTranslations("emptyStates");
  const locale = await getLocale();
  const { role, userId, schoolId } = await enforceRouteAccess("/list/messages");
  const resolvedSearchParams = await searchParams;
  const { page, ...queryParams } = resolvedSearchParams;
  const currentPage = getQueryParam(page);
  const p = currentPage ? parseInt(currentPage) : 1;
  const academicYearId = await getCurrentAcademicYearIdOrNull(schoolId);

  if (!academicYearId) {
    return <NoCurrentAcademicYearMessage />;
  }

  const query: Prisma.MessageWhereInput = { schoolId, academicYearId };
  const andConditions: Prisma.MessageWhereInput[] = [];

  if (queryParams) {
    for (const [key, rawValue] of Object.entries(queryParams)) {
      const value = getQueryParam(rawValue);

      if (value !== undefined) {
        switch (key) {
          case "search":
            andConditions.push({
              OR: [
                { title: { contains: value, mode: "insensitive" } },
                { description: { contains: value, mode: "insensitive" } },
              ],
            });
            break;
        }
      }
    }
  }

  // Role visibility
  if (role !== "admin") {
    if (!userId) throw new Error("Unauthorized");

    const roleVisibility: Prisma.MessageWhereInput =
      role === "teacher"
        ? {
            OR: [
              { teachers: { some: { id: userId } } },
              {
                classes: {
                  some: { lessons: { some: { teacherId: userId } } },
                },
              },
            ],
          }
        : role === "student"
          ? {
              OR: [
                { students: { some: { id: userId } } },
                {
                  classes: {
                    some: { students: { some: { id: userId } } },
                  },
                },
              ],
            }
          : role === "parent"
            ? {
                OR: [
                  { parents: { some: { id: userId } } },
                  {
                    classes: {
                      some: {
                        students: { some: { parentId: userId } },
                      },
                    },
                  },
                ],
              }
            : {};

    andConditions.push(roleVisibility);
  }

  // Attach conditions
  if (andConditions.length > 0) {
    query.AND = andConditions;
  }

  const where = query;
  const sortParam = getQueryParam(queryParams.sort);
  const orderBy: Prisma.MessageOrderByWithRelationInput =
    sortParam === "asc" ? { date: "asc" } : { date: "desc" };

  const [data, count, totalClassesCount] = await prisma.$transaction([
    prisma.message.findMany({
      where,
      include: {
        classes: { select: { id: true, name: true } },
        students: { select: { id: true, name: true } },
        parents: { select: { id: true, name: true } },
        teachers: { select: { id: true, name: true } },
      },
      orderBy,
      take: ITEM_PER_PAGE,
      skip: (p - 1) * ITEM_PER_PAGE,
    }),
    prisma.message.count({ where }),
    prisma.class.count({ where: { schoolId } }),
  ]);

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      <DataPageHeader
        title={t("allMessages")}
        count={count}
        actions={
          role === "admin" ? (
            <FormContainer table="message" type="create" />
          ) : undefined
        }
      />

      <DataPageToolbar
        search={<TableSearch />}
        actions={<FilterSortActions sortKey="sort" />}
      />

      <Table
        columns={getColumns(role, th)}
        renderRow={(item) =>
          renderRow(item, role, totalClassesCount, filtersT("allClasses"), locale)
        }
        data={data}
        emptyTitle={emptyT("messages")}
        emptyDescription={emptyT("filterDescription")}
      />

      <Pagination page={p} count={count} />
    </div>
  );
};

export default MessageListPage;
