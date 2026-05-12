import { Prisma } from "@prisma/client";
import { getCurrentAcademicYearIdOrNull } from "@/lib/academicYears";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";

type BuildAssignmentQueryInput = {
  searchParams: PageSearchParams;
schoolId: number;
  role: string | null;
  userId: string;
};

export async function buildAssignmentQuery({
  searchParams,
  schoolId,
  role,
  userId,
}: BuildAssignmentQueryInput) {
  const resolvedSearchParams = await searchParams;

  const { page, sort, ...queryParams } = resolvedSearchParams;

  const currentPage = getQueryParam(page);
  const p = currentPage ? Number.parseInt(currentPage, 10) : 1;

  const academicYearId = await getCurrentAcademicYearIdOrNull(schoolId);

  const sortParam = getQueryParam(sort);

  const orderBy: Prisma.AssignmentOrderByWithRelationInput =
    sortParam === "desc" ? { endDate: "desc" } : { endDate: "asc" };

  if (!academicYearId) {
    return {
      academicYearId: null,
      query: null,
      orderBy,
      page: 1,
    };
  }

  const query: Prisma.AssignmentWhereInput = {
    schoolId,
    academicYearId,
  };

  const conditions: Prisma.AssignmentWhereInput[] = [];

  for (const [key, rawValue] of Object.entries(queryParams)) {
    const value = getQueryParam(rawValue);

    if (value === undefined || value === "") continue;

    switch (key) {
      case "classId": {
        const classId = Number.parseInt(value, 10);

        if (!Number.isNaN(classId)) {
          conditions.push({
            lesson: {
              classId,
            },
          });
        }

        break;
      }

      case "teacherId":
        conditions.push({
          lesson: {
            teacherId: value,
          },
        });
        break;

      case "search":
        conditions.push({
          OR: [
            {
              title: {
                contains: value,
                mode: "insensitive",
              },
            },
            {
              lesson: {
                subject: {
                  name: {
                    contains: value,
                    mode: "insensitive",
                  },
                },
              },
            },
          ],
        });
        break;
    }
  }

  switch (role) {
    case "admin":
      break;

    case "teacher":
      conditions.push({
        lesson: {
          teacherId: userId,
        },
      });
      break;

    case "student":
      conditions.push({
        lesson: {
          class: {
            students: {
              some: { id: userId },
            },
          },
        },
      });
      break;

    case "parent":
      conditions.push({
        lesson: {
          class: {
            students: {
              some: { parentId: userId },
            },
          },
        },
      });
      break;
  }

  if (conditions.length > 0) {
    query.AND = conditions;
  }

  return {
    academicYearId,
    query,
    orderBy,
    page: Number.isNaN(p) || p < 1 ? 1 : p,
  };
}