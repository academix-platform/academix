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
