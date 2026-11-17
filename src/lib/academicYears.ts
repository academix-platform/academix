import prisma from "./prisma";

export type AcademicYearItem = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  firstSemesterStartDate: string | null;
  firstSemesterEndDate: string | null;
  secondSemesterStartDate: string | null;
  secondSemesterEndDate: string | null;
  currentSemester: "FIRST" | "SECOND";
  currentSemesterStartDate: string | null;
  currentSemesterEndDate: string | null;
};

export const semesterAndAnnualWhere = (semester: "FIRST" | "SECOND") => ({
  OR: [{ semester }, { semester: null }],
});

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
        firstSemesterStartDate: true,
        firstSemesterEndDate: true,
        secondSemesterStartDate: true,
        secondSemesterEndDate: true,
        currentSemester: true,
      },
    });

    return years.map((year) => {
      const currentSemesterStartDate =
        year.currentSemester === "FIRST"
          ? year.firstSemesterStartDate
          : year.secondSemesterStartDate;
      const currentSemesterEndDate =
        year.currentSemester === "FIRST"
          ? year.firstSemesterEndDate
          : year.secondSemesterEndDate;

      return {
        id: year.id,
        name: year.name,
        startDate: toIsoDate(year.startDate),
        endDate: toIsoDate(year.endDate),
        isCurrent: year.isCurrent,
        firstSemesterStartDate: year.firstSemesterStartDate
          ? toIsoDate(year.firstSemesterStartDate)
          : null,
        firstSemesterEndDate: year.firstSemesterEndDate
          ? toIsoDate(year.firstSemesterEndDate)
          : null,
        secondSemesterStartDate: year.secondSemesterStartDate
          ? toIsoDate(year.secondSemesterStartDate)
          : null,
        secondSemesterEndDate: year.secondSemesterEndDate
          ? toIsoDate(year.secondSemesterEndDate)
          : null,
        currentSemester: year.currentSemester,
        currentSemesterStartDate: currentSemesterStartDate
          ? toIsoDate(currentSemesterStartDate)
          : null,
        currentSemesterEndDate: currentSemesterEndDate
          ? toIsoDate(currentSemesterEndDate)
          : null,
      };
    });
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
      firstSemesterStartDate: true,
      firstSemesterEndDate: true,
      secondSemesterStartDate: true,
      secondSemesterEndDate: true,
      currentSemester: true,
    },
  });

  if (!currentYear) {
    return null;
  }

  const currentSemesterStartDate =
    currentYear.currentSemester === "FIRST"
      ? currentYear.firstSemesterStartDate
      : currentYear.secondSemesterStartDate;
  const currentSemesterEndDate =
    currentYear.currentSemester === "FIRST"
      ? currentYear.firstSemesterEndDate
      : currentYear.secondSemesterEndDate;

  return {
    id: currentYear.id,
    name: currentYear.name,
    startDate: toIsoDate(currentYear.startDate),
    endDate: toIsoDate(currentYear.endDate),
    isCurrent: currentYear.isCurrent,
    firstSemesterStartDate: currentYear.firstSemesterStartDate
      ? toIsoDate(currentYear.firstSemesterStartDate)
      : null,
    firstSemesterEndDate: currentYear.firstSemesterEndDate
      ? toIsoDate(currentYear.firstSemesterEndDate)
      : null,
    secondSemesterStartDate: currentYear.secondSemesterStartDate
      ? toIsoDate(currentYear.secondSemesterStartDate)
      : null,
    secondSemesterEndDate: currentYear.secondSemesterEndDate
      ? toIsoDate(currentYear.secondSemesterEndDate)
      : null,
    currentSemester: currentYear.currentSemester,
    currentSemesterStartDate: currentSemesterStartDate
      ? toIsoDate(currentSemesterStartDate)
      : null,
    currentSemesterEndDate: currentSemesterEndDate
      ? toIsoDate(currentSemesterEndDate)
      : null,
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
