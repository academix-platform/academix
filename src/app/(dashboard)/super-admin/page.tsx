import Pagination from "@/components/Pagination";
import SchoolStatusActions from "@/components/SchoolStatusActions";
import SchoolStatusFilter from "@/components/SchoolStatusFilter";
import Table from "@/components/Table";
import TableSearch from "@/components/TableSearch";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import type { PageSearchParams } from "@/lib/pageParams";
import { getQueryParam } from "@/lib/pageParams";
import prisma from "@/lib/prisma";
import { ITEM_PER_PAGE } from "@/lib/settings";
import { School, SchoolStatus } from "@prisma/client";
import { getTranslations } from "next-intl/server";

const statusPillClass: Record<SchoolStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ACTIVE: "bg-green-100 text-green-800",
  PAUSED: "bg-red-100 text-red-800",
};

const StatusPill = ({ status }: { status: SchoolStatus }) => (
  <span className={`px-2 py-1 rounded-full text-xs ${statusPillClass[status]}`}>
    {status}
  </span>
);

const SuperAdminPage = async ({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) => {
  const pagesT = await getTranslations("sidebar.items");
  const th = await getTranslations("tableHeaders");
  const emptyT = await getTranslations("emptyStates");
  await enforceRouteAccess("/super-admin");
  const resolved = await searchParams;
  const page = Number.parseInt(getQueryParam(resolved.page) ?? "1", 10) || 1;
  const search = getQueryParam(resolved.search)?.trim() ?? "";
  const status = getQueryParam(resolved.status) as SchoolStatus | undefined;

  const where = {
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            {
              admins: {
                some: {
                  username: { contains: search, mode: "insensitive" as const },
                },
              },
            },
          ],
        }
      : {}),
    ...(status && ["PENDING", "ACTIVE", "PAUSED"].includes(status)
      ? { status }
      : {}),
  };

  const [schools, count] = await Promise.all([
    prisma.school.findMany({
      where,
      include: { admins: true },
      orderBy: { createdAt: "desc" },
      take: ITEM_PER_PAGE,
      skip: (page - 1) * ITEM_PER_PAGE,
    }),
    prisma.school.count({ where }),
  ]);

  return (
    <div className="flex-1 bg-white m-2 sm:m-4 mt-0 sm:mt-0 p-3 sm:p-4 rounded-md">
      <div className="flex sm:flex-row flex-col sm:flex-wrap justify-between sm:items-center gap-4">
        <h1 className="font-semibold text-lg">{pagesT("schools")}</h1>
        <div className="flex sm:flex-row flex-col sm:flex-wrap sm:items-center gap-2 w-fit">
          <TableSearch />
          <SchoolStatusFilter />
        </div>
      </div>

      <div className="md:hidden space-y-3 mt-4">
        {schools.length === 0 ? (
          <div className="flex justify-center items-center min-h-[300px]">
            <div className="text-gray-500 text-sm text-center">
              <p className="font-medium text-gray-700">
                {emptyT("defaultTitle")}
              </p>
              <p>{emptyT("defaultDescription")}</p>
            </div>
          </div>
        ) : (
          schools.map((school) => (
            <div
              key={school.id}
              className="bg-white shadow-sm p-3 border border-gray-100 rounded-md"
            >
              <div className="flex justify-between items-start gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{school.name}</p>
                  <p className="mt-1 text-gray-500 text-xs">
                    {th("adminUsername")}: {school.admins[0]?.username ?? "-"}
                  </p>
                </div>
                <StatusPill status={school.status} />
              </div>

              {school.pauseReason && (
                <p className="mt-3 text-gray-600 text-xs">
                  <span className="font-medium">{th("pauseReason")}:</span>{" "}
                  {school.pauseReason}
                </p>
              )}

              <div className="mt-3">
                <SchoolStatusActions
                  schoolId={school.id}
                  schoolName={school.name}
                  schoolStatus={school.status}
                />
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden md:block">
        <Table
          columns={[
            { header: th("school"), accessor: "school" },
            { header: th("adminUsername"), accessor: "admin" },
            { header: th("status"), accessor: "status" },
            {
              header: th("pauseReason"),
              accessor: "reason",
              className: "hidden lg:table-cell",
            },
            { header: th("actions"), accessor: "actions" },
          ]}
          data={schools}
          emptyTitle={emptyT("defaultTitle")}
          emptyDescription={emptyT("defaultDescription")}
          renderRow={(school: School & { admins: { username: string }[] }) => (
            <tr
              key={school.id}
              className="hover:bg-academixPurpleLight even:bg-slate-50 border-b text-sm"
            >
              <td className="p-4 font-medium">{school.name}</td>
              <td>{school.admins[0]?.username ?? "-"}</td>
              <td>
                <StatusPill status={school.status} />
              </td>
              <td className="hidden lg:table-cell">
                {school.pauseReason ?? "-"}
              </td>
              <td>
                <SchoolStatusActions
                  schoolId={school.id}
                  schoolName={school.name}
                  schoolStatus={school.status}
                />
              </td>
            </tr>
          )}
        />
      </div>

      <Pagination page={page} count={count} />
    </div>
  );
};

export default SuperAdminPage;
