import prisma from "./prisma";

export type AcademicYearItem = {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
};

const toIsoDate = (value: Date) => value.toISOString().slice(0, 10);

export const getAcademicYears = async (): Promise<AcademicYearItem[]> => {
  const academicYearDelegate = (
    prisma as unknown as {
      academicYear?: {
        findMany: (args: {
          orderBy: Array<{ startDate: "asc" | "desc" }>;
          select: {
            id: boolean;
            name: boolean;
            startDate: boolean;
            endDate: boolean;
            isCurrent: boolean;
          };
        }) => Promise<
          Array<{
            id: number;
            name: string;
            startDate: Date;
            endDate: Date;
            isCurrent: boolean;
          }>
        >;
      };
    }
  ).academicYear;

  if (!academicYearDelegate?.findMany) {
    return [];
  }

  try {
    const years = await academicYearDelegate.findMany({
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

export const getCurrentAcademicYearId = async (): Promise<number> => {
  const currentYearId = await getCurrentAcademicYearIdOrNull();

  if (!currentYearId) {
    throw new Error(
      "No current academic year found. Create one and mark it as current in settings.",
    );
  }

  return currentYearId;
};

export const getCurrentAcademicYearIdOrNull = async (): Promise<
  number | null
> => {
  const currentYear = await prisma.academicYear.findFirst({
    where: { isCurrent: true },
    orderBy: { startDate: "desc" },
    select: { id: true },
  });

  return currentYear?.id ?? null;
};
