import FilterSortActions from "@/components/FilterSortActions";
import FormContainer from "@/components/FormContainer";
import MessageViewModal from "@/components/MessageViewModal";
import Pagination from "@/components/Pagination";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { getCurrentRole, getUserId, type UserRole } from "@/lib/auth";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import {
  Class,
  Message,
  Parent,
  Prisma,
  Student,
  Teacher,
} from "@prisma/client";

type MessageList = Message & {
  classes: Pick<Class, "id" | "name">[];
  students: Pick<Student, "id" | "name">[];
  parents: Pick<Parent, "id" | "name">[];
  teachers: Pick<Teacher, "id" | "name">[];
};

const isLimitedMessageRole = (role: UserRole | null) =>
  role === "student" || role === "parent" || role === "teacher";

const getColumns = (role: UserRole | null) => {
  if (isLimitedMessageRole(role)) {
    return [
      {
        header: "Title",
        accessor: "title",
      },
      {
        header: "Content",
        accessor: "description",
      },
      {
        header: "Date",
        accessor: "date",
      },
      {
        header: "Time",
        accessor: "time",
      },
      {
        header: "Actions",
        accessor: "action",
      },
    ];
  }

  return [
    {
      header: "Title",
      accessor: "title",
    },
    {
      header: "Content",
      accessor: "description",
    },
    {
      header: "Sent To",
      accessor: "recipients",
    },
    {
      header: "Class",
      accessor: "class",
    },
    {
      header: "Date",
      accessor: "date",
      className: "hidden md:table-cell",
    },
    {
      header: "Time",
      accessor: "time",
      className: "hidden md:table-cell",
    },
    {
      header: role === "admin" ? "Actions" : "",
      accessor: "action",
    },
  ];
};

const getRecipientsLabel = (item: MessageList) => {
  const parts: string[] = [];

  if (item.students.length > 0) {
    parts.push(`Students: ${item.students.map((s) => s.name).join(", ")}`);
  }
  if (item.parents.length > 0) {
    parts.push(`Parents: ${item.parents.map((p) => p.name).join(", ")}`);
  }
  if (item.teachers.length > 0) {
    parts.push(`Teachers: ${item.teachers.map((t) => t.name).join(", ")}`);
  }

  return parts.join(" | ") || "-";
};

const getRecipientsPreview = (item: MessageList) => {
  const recipients = [
    ...item.students.map((student) => student.name),
    ...item.parents.map((parent) => parent.name),
    ...item.teachers.map((teacher) => teacher.name),
  ];

  if (recipients.length === 0) return "-";
  if (recipients.length === 1) return recipients[0];

  return `${recipients[0]} +${recipients.length - 1} more`;
};

const getDescriptionPreview = (description: string) => {
  const text = description.trim();

  if (text.length <= 40) {
    return text;
  }

  return `${text.slice(0, 40).trimEnd()}...`;
};

const renderRow = (
  item: MessageList,
  role: UserRole | null,
  totalClassesCount: number,
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
          ? "All Classes"
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
  const role = await getCurrentRole();
  const userId = await getUserId();
  const resolvedSearchParams = await searchParams;
  const { page, ...queryParams } = resolvedSearchParams;
  const currentPage = getQueryParam(page);
  const p = currentPage ? parseInt(currentPage) : 1;

  const query: Prisma.MessageWhereInput = {};
  const andConditions: Prisma.MessageWhereInput[] = [];

  if (queryParams) {
    for (const [key, rawValue] of Object.entries(queryParams)) {
      const value = getQueryParam(rawValue);
      if (value !== undefined) {
        switch (key) {
          case "search": {
            query.OR = [
              { title: { contains: value, mode: "insensitive" } },
              { description: { contains: value, mode: "insensitive" } },
            ];
            break;
          }
          default:
            break;
        }
      }
    }
  }

  if (role !== "admin" && userId) {
    const roleVisibility: Prisma.MessageWhereInput =
      role === "teacher"
        ? {
            OR: [
              { teachers: { some: { id: userId } } },
              {
                classes: { some: { lessons: { some: { teacherId: userId } } } },
              },
            ],
          }
        : role === "student"
          ? {
              OR: [
                { students: { some: { id: userId } } },
                { classes: { some: { students: { some: { id: userId } } } } },
              ],
            }
          : role === "parent"
            ? {
                OR: [
                  { parents: { some: { id: userId } } },
                  {
                    classes: {
                      some: { students: { some: { parentId: userId } } },
                    },
                  },
                ],
              }
            : {};

    andConditions.push(roleVisibility);
  }

  const where: Prisma.MessageWhereInput =
    andConditions.length > 0 ? { AND: [query, ...andConditions] } : query;

  const [data, count, totalClassesCount] = await prisma.$transaction([
    prisma.message.findMany({
      where,
      include: {
        classes: { select: { id: true, name: true } },
        students: { select: { id: true, name: true } },
        parents: { select: { id: true, name: true } },
        teachers: { select: { id: true, name: true } },
      },
      orderBy: { date: "desc" },
      take: ITEM_PER_PAGE,
      skip: (p - 1) * ITEM_PER_PAGE,
    }),
    prisma.message.count({ where }),
    prisma.class.count(),
  ]);

  return (
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      {/* TOP */}
      <div className="flex justify-between items-center">
        <h1 className="hidden md:block font-semibold text-lg">All Messages</h1>
        <div className="flex md:flex-row flex-col items-center gap-4 w-full md:w-auto">
          <TableSearch />
          <div className="flex items-center self-end gap-4">
            <FilterSortActions />
            {role === "admin" && (
              <FormContainer table="message" type="create" />
            )}
          </div>
        </div>
      </div>
      {/* LIST */}
      <Table
        columns={getColumns(role)}
        renderRow={(item) => renderRow(item, role, totalClassesCount)}
        data={data}
      />
      {/* PAGINATION */}
      <Pagination page={p} count={count} />
    </div>
  );
};

export default MessageListPage;
