import { Prisma, StudentStatus } from "@prisma/client";
import { getQueryParam, type PageSearchParams } from "@/lib/pageParams";

type BuildStudentQueryInput = {
  searchParams: PageSearchParams;
  schoolId: number;
  currentAcademicYearId: number;
  role: string | null;
  userId: string;
};

const validStatuses: StudentStatus[] = [
  "ACTIVE",
  "REPEATED",
  "GRADUATED",
  "LEFT",
];

export async function buildStudentQuery({
  searchParams,
  schoolId,
  currentAcademicYearId,
  role,
  userId,
}: BuildStudentQueryInput) {
  const resolvedSearchParams = await searchParams;

  const { page, ...queryParams } = resolvedSearchParams;

  const currentPage = getQueryParam(page);
  const p = currentPage ? parseInt(currentPage) : 1;

  const academicYearParam = getQueryParam(queryParams.academicYearId);
  const statusParam = getQueryParam(queryParams.status);
  const repeatCountParam = getQueryParam(queryParams.repeatCount);

  const selectedAcademicYearId = academicYearParam
    ? Number.parseInt(academicYearParam, 10)
    : currentAcademicYearId;

  const selectedStatus = validStatuses.includes(statusParam as StudentStatus)
    ? (statusParam as StudentStatus)
    : "ACTIVE";

  const selectedRepeatCount =
    repeatCountParam && selectedStatus === "REPEATED"
      ? Number.parseInt(repeatCountParam, 10)
      : 1;

  const query: Prisma.StudentWhereInput = {
    schoolId,
    academicYears: {
      some: {
        academicYearId: selectedAcademicYearId,
      },
    },
    status: selectedStatus,
  };

  const conditions: Prisma.StudentWhereInput[] = [];

  if (selectedStatus === "REPEATED") {
    query.repeatCount = Number.isNaN(selectedRepeatCount)
      ? 1
      : selectedRepeatCount;
  }

  for (const [key, rawValue] of Object.entries(queryParams)) {
    const value = getQueryParam(rawValue);

    if (value === undefined || value === "") continue;

    switch (key) {
      case "teacherId":
        conditions.push({
          class: {
            lessons: {
              some: { teacherId: value },
            },
          },
        });
        break;

      case "search":
        conditions.push({
          OR: [
            { name: { contains: value, mode: "insensitive" } },
            { username: { contains: value, mode: "insensitive" } },
            { phone: { contains: value, mode: "insensitive" } },
            { address: { contains: value, mode: "insensitive" } },
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
        class: {
          lessons: {
            some: { teacherId: userId },
          },
        },
      });
      break;
  }

  if (conditions.length > 0) {
    query.AND = conditions;
  }

  const sortParam = getQueryParam(queryParams.sort);

   const orderBy: Prisma.StudentOrderByWithRelationInput =
  sortParam === "desc" ? { name: "desc" } : { name: "asc" };
 
return {
  query,
  orderBy,
  page: Number.isNaN(p) || p < 1 ? 1 : p,
  selectedAcademicYearId,
  selectedStatus,
  selectedRepeatCount,
};
}