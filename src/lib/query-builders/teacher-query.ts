import { Prisma } from "@prisma/client";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";

type BuildTeacherQueryInput = {
  searchParams: PageSearchParams;
  schoolId: number;
};

export async function buildTeacherQuery({
  searchParams,
  schoolId,
}: BuildTeacherQueryInput) {
  const resolvedSearchParams = await searchParams;

  const { page, ...queryParams } = resolvedSearchParams;

  const currentPage = getQueryParam(page);
  const p = currentPage ? parseInt(currentPage, 10) : 1;

  const query: Prisma.TeacherWhereInput = {
    schoolId,
  };

  const conditions: Prisma.TeacherWhereInput[] = [];

  for (const [key, rawValue] of Object.entries(queryParams)) {
    const value = getQueryParam(rawValue);

    if (value === undefined || value === "") continue;

    switch (key) {
      case "classId": {
        const classId = Number.parseInt(value, 10);
        if (!Number.isNaN(classId)) {
          conditions.push({
            lessons: {
              some: {
                classId,
              },
            },
          });
        }
        break;
      }

      case "search":
        conditions.push({
          OR: [
            { name: { contains: value, mode: "insensitive" } },
            { username: { contains: value, mode: "insensitive" } },
            { email: { contains: value, mode: "insensitive" } },
            { phone: { contains: value, mode: "insensitive" } },
            { address: { contains: value, mode: "insensitive" } },
            {
              subjects: {
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

  if (conditions.length > 0) {
    query.AND = conditions;
  }

  const sortParam = getQueryParam(queryParams.sort);

  const orderBy: Prisma.TeacherOrderByWithRelationInput =
    sortParam === "desc" ? { name: "desc" } : { name: "asc" };

  return {
    query,
    orderBy,
    page: Number.isNaN(p) || p < 1 ? 1 : p,
  };
}
