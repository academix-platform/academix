import ArchiveFilters from "@/components/ArchiveFilters";
import ExportButton from "@/components/ExportButton";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

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
    rows = await prisma.exam.findMany({
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
    }).then((items) =>
      items.map((item) => ({
        id: item.id,
        name: item.title,
      }))
    );
  }

  if (selectedType === "assignments") {
    rows = await prisma.assignment.findMany({
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
    }).then((items) =>
      items.map((item) => ({
        id: item.id,
        name: item.title,
      }))
    );
  }

  if (selectedType === "results") {
    rows = await prisma.result.findMany({
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
    }).then((items) =>
      items.map((item) => ({
        id: item.id,
        name: item.student.name,
        status: String(item.score),
      }))
    );
  }

  if (selectedType === "attendance") {
    rows = await prisma.attendance.findMany({
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
    }).then((items) =>
      items.map((item) => ({
        id: item.id,
        name: item.student?.name || "Unknown student",
        status: item.present ? "Present" : "Absent",
      }))
    );
  }

  return (
    <div className="p-4 md:p-6 flex flex-col gap-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Archive</h1>
            <p className="text-sm text-gray-500 mt-1">
              Export school data by academic year
            </p>
          </div>

          <ExportButton
            href={`/api/export/archive?type=${selectedType}&academicYearId=${selectedYear}`}
            title="Export CSV"
          />
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

      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Preview Data
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Username</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Status / Value</th>
              </tr>
            </thead>

            <tbody>
              {rows.slice(0, 5).map((row) => (
                <tr key={row.id} className="border-b last:border-b-0">
                  <td className="py-3 px-4 font-medium">{row.name}</td>
                  <td className="py-3 px-4">{row.username || "-"}</td>
                  <td className="py-3 px-4">{row.email || "-"}</td>
                  <td className="py-3 px-4">{row.phone || "-"}</td>
                  <td className="py-3 px-4">{row.status || "-"}</td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    No data found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {rows.length > 5 && (
  <div className="flex justify-center mt-6">
    <button className="px-5 py-2 rounded-xl bg-academixPurple text-white text-sm font-medium hover:bg-academixPurpleDark transition">
      Show More
    </button>
  </div>
)}
        </div>
      </div>
    </div>
  );
};

export default ArchivePage;