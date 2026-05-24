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

const statusPillClass: Record<SchoolStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800",
  ACTIVE: "bg-green-100 text-green-800",
  PAUSED: "bg-red-100 text-red-800",
};

const SuperAdminPage = async ({ searchParams }: { searchParams: PageSearchParams }) => {
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
            { admins: { some: { username: { contains: search, mode: "insensitive" as const } } } },
          ],
        }
      : {}),
    ...(status && ["PENDING", "ACTIVE", "PAUSED"].includes(status) ? { status } : {}),
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
    <div className="flex-1 bg-white m-4 mt-0 p-4 rounded-md">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h1 className="font-semibold text-lg">Schools</h1>
        <div className="flex flex-wrap items-center gap-2">
          <TableSearch />
          <SchoolStatusFilter />
        </div>
      </div>

      <Table
        columns={[
          { header: "School", accessor: "school" },
          { header: "Admin Username", accessor: "admin" },
          { header: "Status", accessor: "status" },
          { header: "Pause Reason", accessor: "reason", className: "hidden lg:table-cell" },
          { header: "Actions", accessor: "actions" },
        ]}
        data={schools}
        emptyTitle="No schools found"
        emptyDescription="Try changing your search or status filter."
        renderRow={(school: School & { admins: { username: string }[] }) => (
          <tr key={school.id} className="hover:bg-academixPurpleLight even:bg-slate-50 border-b text-sm">
            <td className="p-4 font-medium">{school.name}</td>
            <td>{school.admins[0]?.username ?? "-"}</td>
            <td>
              <span className={`px-2 py-1 rounded-full text-xs ${statusPillClass[school.status]}`}>
                {school.status}
              </span>
            </td>
            <td className="hidden lg:table-cell">{school.pauseReason ?? "-"}</td>
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

      <Pagination page={page} count={count} />
    </div>
  );
};

export default SuperAdminPage;
