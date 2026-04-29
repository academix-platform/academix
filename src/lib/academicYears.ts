import prisma from "./prisma";

export type AcademicYearItem = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
};

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);

export const getAcademicYears = async (
  schoolId: number,
): Promise<AcademicYearItem[]> => {
  try {
    const years = await prisma.academicYear.findMany({
      where: { schoolId },
      orderBy: [{ startDate: "desc" }],
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        isCurrent: true,
      },
    });

    return years.map((year) => ({
      id: year.id,
      name: year.name,
      startDate: toIsoDate(year.startDate),
      endDate: toIsoDate(year.endDate),
      isCurrent: year.isCurrent,
    }));
  } catch {
    return [];
  }
};

export const getCurrentAcademicYearOrNull = async (
  schoolId: number,
): Promise<AcademicYearItem | null> => {
  const currentYear = await prisma.academicYear.findFirst({
    where: {
      schoolId,
      isCurrent: true,
    },
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      isCurrent: true,
    },
  });

  if (!currentYear) {
    return null;
  }

  return {
    id: currentYear.id,
    name: currentYear.name,
    startDate: toIsoDate(currentYear.startDate),
    endDate: toIsoDate(currentYear.endDate),
    isCurrent: currentYear.isCurrent,
  };
};

export const getCurrentAcademicYearIdOrNull = async (
  schoolId: number,
): Promise<number | null> => {
  const currentYear = await getCurrentAcademicYearOrNull(schoolId);
  return currentYear?.id ?? null;
};

// export const getCurrentAcademicYear = getCurrentAcademicYearOrNull;

// export const getCurrentAcademicYearId = async (): Promise<number> => {
//   const currentYearId = await getCurrentAcademicYearIdOrNull();

//   if (!currentYearId) {
//     throw new Error(
//       "No current academic year found. Create one and mark it as current in settings.",
//     );
//   }

//   return currentYearId;
// };
