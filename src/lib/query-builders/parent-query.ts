import { Prisma } from "@prisma/client";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";

type BuildParentQueryInput = {
  searchParams: PageSearchParams;
  schoolId: number;
  role: string | null;
  userId: string;
};

export async function buildParentQuery({
  searchParams,
  schoolId,
  role,
  userId,
}: BuildParentQueryInput) {
  const resolvedSearchParams = await searchParams;

  const { page, ...queryParams } = resolvedSearchParams;

  const currentPage = getQueryParam(page);
  const p = currentPage ? Number.parseInt(currentPage, 10) : 1;

  const query: Prisma.ParentWhereInput = { schoolId };
  const conditions: Prisma.ParentWhereInput[] = [];

  for (const [key, rawValue] of Object.entries(queryParams)) {
    const value = getQueryParam(rawValue);

    if (value === undefined || value === "") continue;

    switch (key) {
      case "search":
        conditions.push({
          OR: [
            { name: { contains: value, mode: "insensitive" } },
            { username: { contains: value, mode: "insensitive" } },
            { email: { contains: value, mode: "insensitive" } },
            { phone: { contains: value, mode: "insensitive" } },
            { address: { contains: value, mode: "insensitive" } },
            {
              students: {
                some: {
                  name: { contains: value, mode: "insensitive" },
                },
              },
            },
          ],
        });
        break;
    }
  }

  if (role === "teacher") {
    conditions.push({
      students: {
        some: {
          class: {
            lessons: {
              some: { teacherId: userId },
            },
          },
        },
      },
    });
  }

  if (conditions.length > 0) {
    query.AND = conditions;
  }

  const sortParam = getQueryParam(queryParams.sort);

  const orderBy: Prisma.ParentOrderByWithRelationInput =
    sortParam === "desc" ? { name: "desc" } : { name: "asc" };

  return {
    query,
    orderBy,
    page: Number.isNaN(p) || p < 1 ? 1 : p,
  };
}