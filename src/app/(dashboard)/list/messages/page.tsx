import FilterSortActions from "@/components/FilterSortActions";
import FormContainer from "@/components/FormContainer";
import MessageViewModal from "@/components/MessageViewModal";
import NoCurrentAcademicYearMessage from "@/components/NoCurrentAcademicYearMessage";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
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
import { getTranslations } from "next-intl/server";

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
      },
      {
        header: th("date"),
        accessor: "date",
      },
      {
        header: th("time"),
        accessor: "time",
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
    },
    {
      header: th("sentTo"),
      accessor: "recipients",
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
) => {
  if (isLimitedMessageRole(role)) {
    return (
      <tr
        key={item.id}
        className="hover:bg-academixPurpleLight even:bg-slate-50 border-gray-200 border-b text-sm"
      >
        <td className="p-4">{item.title}</td>
        <td>{getDescriptionPreview(item.description)}</td>
        <td>{new Intl.DateTimeFormat("en-US").format(item.date)}</td>
        <td>
          {item.date.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </td>
        <td>
          <div className="flex items-center gap-2">
            <MessageViewModal message={item} />
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr
      key={item.id}
      className="hover:bg-academixPurpleLight even:bg-slate-50 border-gray-200 border-b text-sm"
    >
      <td className="flex items-center gap-4 p-4">{item.title}</td>
      <td>{getDescriptionPreview(item.description)}</td>
      <td>{getRecipientsPreview(item)}</td>
      <td>
        {item.classes.length === totalClassesCount && totalClassesCount > 0
          ? allClassesLabel
          : item.classes.map((cls) => cls.name).join(", ") || "-"}
      </td>
      <td className="hidden md:table-cell">
        {new Intl.DateTimeFormat("en-US").format(item.date)}
      </td>
      <td className="hidden md:table-cell">
        {item.date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })}
      </td>
      <td>
        <div className="flex items-center gap-2">
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
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      {/* TOP */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="font-semibold text-lg">{t("allMessages")}</h1>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center self-end gap-2">
            <FilterSortActions sortKey="sort" />
            {role === "admin" && (
              <FormContainer table="message" type="create" />
            )}
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
        emptyTitle="No messages found"
        emptyDescription="Try changing your filters or search terms."
      />
      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default MessageListPage;
