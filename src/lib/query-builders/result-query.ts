import { Prisma } from "@prisma/client";
import { getCurrentAcademicYearIdOrNull } from "@/lib/academicYears";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";

type BuildResultQueryInput = {
  searchParams: PageSearchParams;
  schoolId: number;
  role: string | null;
  userId: string;
};

export async function buildResultQuery({
  searchParams,
  schoolId,
  role,
  userId,
}: BuildResultQueryInput) {
  const resolvedSearchParams = await searchParams;

  const { page, sort, ...queryParams } = resolvedSearchParams;

  const currentPage = getQueryParam(page);
  const p = currentPage ? Number.parseInt(currentPage, 10) : 1;

  const academicYearId = await getCurrentAcademicYearIdOrNull(schoolId);

  const sortParam = getQueryParam(sort);

  const orderBy: Prisma.ResultOrderByWithRelationInput =
    sortParam === "asc" ? { id: "asc" } : { id: "desc" };

  if (!academicYearId) {
    return {
      academicYearId: null,
      query: null,
      orderBy,
      page: 1,
    };
  }

  const query: Prisma.ResultWhereInput = {
    schoolId,
    academicYearId,
  };

  const conditions: Prisma.ResultWhereInput[] = [];

  for (const [key, rawValue] of Object.entries(queryParams)) {
    const value = getQueryParam(rawValue);

    if (value === undefined || value === "") continue;

    switch (key) {
      case "studentId":
        conditions.push({
          studentId: value,
        });
        break;

      case "search":
        conditions.push({
          OR: [
            {
              student: {
                name: { contains: value, mode: "insensitive" },
              },
            },
            {
              exam: {
                title: { contains: value, mode: "insensitive" },
              },
            },
            {
              assignment: {
                title: { contains: value, mode: "insensitive" },
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
        OR: [
          { exam: { lesson: { teacherId: userId } } },
          { assignment: { lesson: { teacherId: userId } } },
        ],
      });
      break;

    case "student":
      conditions.push({
        studentId: userId,
        OR: [
          // Assignment results — always visible to student
          { assignmentId: { not: null } },
          // Exam results — only visible after grades are published
          {
            examId: { not: null },
            exam: {
              submissions: {
                some: {
                  studentId: userId,
                  gradePublished: true,
                },
              },
            },
          },
        ],
      });
      break;

    case "parent":
      conditions.push({
        student: {
          parentId: userId,
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