import { Prisma } from "@prisma/client";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";

type BuildClassQueryInput = {
  searchParams: PageSearchParams;
schoolId: number;
};

export async function buildClassQuery({
  searchParams,
  schoolId,
}: BuildClassQueryInput) {
  const resolvedSearchParams = await searchParams;

  const { page, sort, ...queryParams } = resolvedSearchParams;

  const currentPage = getQueryParam(page);
  const p = currentPage ? Number.parseInt(currentPage, 10) : 1;

  const query: Prisma.ClassWhereInput = {
    schoolId,
  };

  const conditions: Prisma.ClassWhereInput[] = [];

  for (const [key, rawValue] of Object.entries(queryParams)) {
    const value = getQueryParam(rawValue);

    if (value === undefined || value === "") continue;

    switch (key) {
      case "supervisorId":
        conditions.push({
          supervisorId: value,
        });
        break;

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
              supervisor: {
                name: { contains: value, mode: "insensitive" },
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

  let orderBy: Prisma.ClassOrderByWithRelationInput = {
    name: "asc",
  };

  const sortValue = getQueryParam(sort);

  switch (sortValue) {
    case "asc":
      orderBy = { name: "asc" };
      break;

    case "desc":
    case "name_desc":
      orderBy = { name: "desc" };
      break;

    case "capacity_asc":
      orderBy = { capacity: "asc" };
      break;

    case "capacity_desc":
      orderBy = { capacity: "desc" };
      break;

    case "grade_asc":
      orderBy = {
        grade: {
          level: "asc",
        },
      };
      break;

    case "grade_desc":
      orderBy = {
        grade: {
          level: "desc",
        },
      };
      break;

    default:
      orderBy = { name: "asc" };
      break;
  }

  return {
    query,
    orderBy,
    page: Number.isNaN(p) || p < 1 ? 1 : p,
  };
}