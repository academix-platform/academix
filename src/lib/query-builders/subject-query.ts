import { Prisma } from "@prisma/client";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";

type BuildSubjectQueryInput = {
  searchParams: PageSearchParams;
  schoolId: number;
  role: string | null;
  userId: string;
};

export async function buildSubjectQuery({
  searchParams,
  schoolId,
  role,
  userId,
}: BuildSubjectQueryInput) {
  const resolvedSearchParams = await searchParams;

  const { page, ...queryParams } = resolvedSearchParams;

  const currentPage = getQueryParam(page);
  const p = currentPage ? Number.parseInt(currentPage, 10) : 1;

  const query: Prisma.SubjectWhereInput = {
    schoolId,
  };

  const conditions: Prisma.SubjectWhereInput[] = [];

  for (const [key, rawValue] of Object.entries(queryParams)) {
    const value = getQueryParam(rawValue);

    if (value === undefined || value === "") continue;

    switch (key) {
      case "gradeId": {
        const gradeId = Number.parseInt(value, 10);
        if (!Number.isNaN(gradeId)) {
          conditions.push({
            gradeId,
          });
        }
        break;
      }

      case "search":
        conditions.push({
          OR: [
            { name: { contains: value, mode: "insensitive" } },
            {
              teachers: {
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
      teachers: {
        some: {
          id: userId,
        },
      },
    });
  }

  if (role === "student") {
    conditions.push({
      grade: {
        students: {
          some: {
            id: userId,
          },
        },
      },
    });
  }

  if (conditions.length > 0) {
    query.AND = conditions;
  }

  const sortParam = getQueryParam(queryParams.sort);

  const orderBy: Prisma.SubjectOrderByWithRelationInput =
    sortParam === "desc" ? { name: "desc" } : { name: "asc" };

  return {
    query,
    orderBy,
    page: Number.isNaN(p) || p < 1 ? 1 : p,
  };
}
