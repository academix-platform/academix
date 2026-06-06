import ArchiveFilters from "@/components/ArchiveFilters";
import ExportButton from "@/components/ExportButton";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getTranslations } from "next-intl/server";

type ArchiveRow = {
  id: string | number;
  name: string;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
};

const ArchivePage = async ({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    academicYearId?: string;
  }>;
}) => {
  const t = await getTranslations("pages");
  const archiveT = await getTranslations("archivePage");
  const th = await getTranslations("tableHeaders");
  const params = await searchParams;
  const user = await requireAuth();

  const admin = await prisma.admin.findUnique({
    where: { id: user.userId },
  });

  if (!admin) return null;

  const academicYears = await prisma.academicYear.findMany({
    distinct: ["name"],
    orderBy: { startDate: "desc" },
  });

  const selectedType = params.type || "students";
  const selectedYear =
    params.academicYearId || academicYears[0]?.id.toString() || "";

  let rows: ArchiveRow[] = [];

  if (selectedType === "students") {
    rows = await prisma.student.findMany({
      where: {
        schoolId: admin.schoolId,
        academicYears: {
          some: {
            academicYearId: Number(selectedYear),
          },
        },
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        status: true,
      },
    });
  }

  if (selectedType === "teachers") {
    rows = await prisma.teacher.findMany({
      where: {
        schoolId: admin.schoolId,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
      },
    });
  }

  if (selectedType === "parents") {
    rows = await prisma.parent.findMany({
      where: {
        schoolId: admin.schoolId,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
      },
    });
  }

  if (selectedType === "subjects") {
    rows = await prisma.subject.findMany({
      where: {
        schoolId: admin.schoolId,
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  if (selectedType === "classes") {
    rows = await prisma.class.findMany({
      where: {
        schoolId: admin.schoolId,
      },
      select: {
        id: true,
        name: true,
      },
    });
  }

  if (selectedType === "exams") {
    rows = await prisma.exam
      .findMany({
        where: {
          lesson: {
            subject: {
              schoolId: admin.schoolId,
            },
          },
        },
        select: {
          id: true,
          title: true,
        },
      })
      .then((items) =>
        items.map((item) => ({
          id: item.id,
          name: item.title,
        })),
      );
  }

  if (selectedType === "assignments") {
    rows = await prisma.assignment
      .findMany({
        where: {
          lesson: {
            subject: {
              schoolId: admin.schoolId,
            },
          },
        },
        select: {
          id: true,
          title: true,
        },
      })
      .then((items) =>
        items.map((item) => ({
          id: item.id,
          name: item.title,
        })),
      );
  }

  if (selectedType === "results") {
    rows = await prisma.result
      .findMany({
        where: {
          student: {
            schoolId: admin.schoolId,
          },
        },
        select: {
          id: true,
          score: true,
          student: {
            select: {
              name: true,
            },
          },
        },
      })
      .then((items) =>
        items.map((item) => ({
          id: item.id,
          name: item.student.name,
          status: String(item.score),
        })),
      );
  }

  if (selectedType === "attendance") {
    rows = await prisma.attendance
      .findMany({
        where: {
          student: {
            schoolId: admin.schoolId,
          },
        },
        select: {
          id: true,
          present: true,
          student: {
            select: {
              name: true,
            },
          },
        },
      })
      .then((items) =>
        items.map((item) => ({
          id: item.id,
          name: item.student?.name || archiveT("unknownStudent"),
          status: item.present ? archiveT("present") : archiveT("absent"),
        })),
      );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <div className="flex lg:flex-row flex-col lg:justify-between lg:items-center gap-4">
          <div>
            <h1 className="font-bold text-gray-800 text-2xl">{t("archive")}</h1>
          </div>
        </div>
      </div>

      <ArchiveFilters
        academicYears={academicYears.map((year) => ({
          id: year.id.toString(),
          name: year.name,
        }))}
        selectedType={selectedType}
        selectedYear={selectedYear}
      />

      <div className="bg-white shadow-sm p-6 border border-gray-100 rounded-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="mb-4 font-semibold text-gray-800 text-lg">
            {archiveT("previewData")}
          </h2>
          <ExportButton
            href={`/api/export/archive?type=${selectedType}&academicYearId=${selectedYear}`}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-gray-500 text-start">
                <th className="px-4 py-3">{th("name")}</th>
                <th className="px-4 py-3">{th("username")}</th>
                <th className="px-4 py-3">{th("email")}</th>
                <th className="px-4 py-3">{th("phone")}</th>
                <th className="px-4 py-3">{th("statusValue")}</th>
              </tr>
            </thead>

            <tbody>
              {rows.slice(0, 5).map((row) => (
                <tr key={row.id} className="border-b last:border-b-0">
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3">{row.username || "-"}</td>
                  <td className="px-4 py-3">{row.email || "-"}</td>
                  <td className="px-4 py-3">{row.phone || "-"}</td>
                  <td className="px-4 py-3">{row.status || "-"}</td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-gray-400 text-center">
                    {archiveT("noData")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {rows.length > 5 && (
            <div className="flex justify-center mt-6">
              <button className="bg-academixPurple hover:bg-academixPurpleDark px-5 py-2 rounded-xl font-medium text-white text-sm transition">
                {archiveT("showMore")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArchivePage;
