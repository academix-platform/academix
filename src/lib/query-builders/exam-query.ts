import { Prisma } from "@prisma/client";
import { getCurrentAcademicYearIdOrNull } from "@/lib/academicYears";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";

type BuildExamQueryInput = {
  searchParams: PageSearchParams;
  schoolId: number;
  role: string | null;
  userId: string;
};

export async function buildExamQuery({
  searchParams,
  schoolId,
  role,
  userId,
}: BuildExamQueryInput) {
  const resolvedSearchParams = await searchParams;

  const { page, sort, ...queryParams } = resolvedSearchParams;

  const currentPage = getQueryParam(page);
  const p = currentPage ? Number.parseInt(currentPage, 10) : 1;

  const academicYearId = await getCurrentAcademicYearIdOrNull(schoolId);

  // Default to newest exams first unless the user explicitly asks for ascending order.
  const orderBy: Prisma.ExamOrderByWithRelationInput =
    getQueryParam(sort) === "asc"
      ? { startTime: "asc" }
      : { startTime: "desc" };

  if (!academicYearId) {
    return {
      academicYearId: null,
      query: null,
      orderBy,
      page: 1,
    };
  }

  const query: Prisma.ExamWhereInput = {
    schoolId,
    academicYearId,
  };

  const conditions: Prisma.ExamWhereInput[] = [];

  for (const [key, rawValue] of Object.entries(queryParams)) {
    const value = getQueryParam(rawValue);

    if (value === undefined || value === "") continue;

    switch (key) {
      case "classId": {
        const classId = Number.parseInt(value, 10);
        if (!Number.isNaN(classId)) {
          conditions.push({
            classId,
          });
        }
        break;
      }

      case "gradeId": {
        const gradeId = Number.parseInt(value, 10);
        if (!Number.isNaN(gradeId)) {
          conditions.push({
            class: { gradeId },
          });
        }
        break;
      }

      case "teacherId":
        conditions.push({
          OR: [{ teacherId: value }, { lesson: { teacherId: value } }],
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
              subject: {
                name: {
                  contains: value,
                  mode: "insensitive",
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
        OR: [{ teacherId: userId }, { lesson: { teacherId: userId } }],
      });
      break;

    case "student":
      conditions.push({
        class: {
          students: {
            some: { id: userId },
          },
        },
      });
      break;

    case "parent":
      conditions.push({
        class: {
          students: {
            some: { parentId: userId },
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
