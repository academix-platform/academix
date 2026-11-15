import ArchiveFilters from "@/components/ArchiveFilters";
import ExportButton from "@/components/ExportButton";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { DataPageHeader } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
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
  finalGrade?: string | null;
};

type StoredFinalResult = {
  studentId: string;
  averageScore: number;
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
  const sidebarT = await getTranslations("sidebar.items");
  const params = await searchParams;
  const user = await requireAuth();

  const admin = await prisma.admin.findUnique({
    where: { id: user.userId },
  });

  if (!admin) return null;

  const academicYears = await prisma.academicYear.findMany({
    where: {
      schoolId: admin.schoolId,
    },
    orderBy: { startDate: "desc" },
  });

  const selectedType = params.type || "students";
  const selectedYear =
    params.academicYearId || academicYears[0]?.id.toString() || "";

  let rows: ArchiveRow[] = [];

  if (selectedType === "students") {
    const students = await prisma.student.findMany({
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

    const studentIds = students.map((student) => student.id);
    const finalResults: StoredFinalResult[] = studentIds.length
      ? await (
          prisma as unknown as {
            studentFinalResult: {
              findMany: (args: {
                where: {
                  schoolId: number;
                  academicYearId: number;
                  studentId: { in: string[] };
                };
                select: {
                  studentId: boolean;
                  averageScore: boolean;
                };
              }) => Promise<StoredFinalResult[]>;
            };
          }
        ).studentFinalResult.findMany({
          where: {
            schoolId: admin.schoolId,
            academicYearId: Number(selectedYear),
            studentId: { in: studentIds },
          },
          select: {
            studentId: true,
            averageScore: true,
          },
        })
      : [];
    const finalGradeByStudent = new Map(
      finalResults.map((result) => [
        result.studentId,
        `${result.averageScore.toFixed(2)}%`,
      ]),
    );

    rows = students.map((student) => ({
      ...student,
      finalGrade: finalGradeByStudent.get(student.id) ?? "-",
    }));
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
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        items={[
          { label: sidebarT("archive"), isCurrent: true },
        ]}
      />

      {/* Page Header */}
      <DataPageHeader
        title={t("archive")}
        count={rows.length}
      />

      {/* Filters Card */}
      <ArchiveFilters
        academicYears={academicYears.map((year) => ({
          id: year.id.toString(),
          name: year.name,
        }))}
        selectedType={selectedType}
        selectedYear={selectedYear}
      />

      {/* Preview Data Card */}
      <div className="bg-surface rounded-2xl p-5 md:p-6 shadow-2xs border border-outline/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-outline/60">
          <div className="flex items-center gap-2.5">
            <h2 className="font-bold text-base md:text-lg text-content-primary tracking-tight">
              {archiveT("previewData")}
            </h2>
            <Badge variant="secondary" size="sm">
              {rows.length}
            </Badge>
          </div>

          <ExportButton
            href={`/api/export/archive?type=${selectedType}&academicYearId=${selectedYear}`}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-outline/70 bg-surface-muted/40 text-content-muted text-start text-[11px] font-semibold uppercase tracking-wider">
                <th className="px-4 py-3 text-start">{th("name")}</th>
                <th className="px-4 py-3 text-start">{th("username")}</th>
                <th className="px-4 py-3 text-start">{th("email")}</th>
                <th className="px-4 py-3 text-start">{th("phone")}</th>
                {selectedType === "students" && (
                  <th className="px-4 py-3 text-start">{th("finalGrade")}</th>
                )}
                <th className="px-4 py-3 text-start">{th("statusValue")}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-outline/60">
              {rows.slice(0, 10).map((row) => (
                <tr key={row.id} className="hover:bg-surface-muted/40 transition-colors">
                  <td className="px-4 py-3 font-semibold text-content-primary">{row.name}</td>
                  <td className="px-4 py-3 text-content-secondary">{row.username || "-"}</td>
                  <td className="px-4 py-3 text-content-secondary">{row.email || "-"}</td>
                  <td className="px-4 py-3 text-content-secondary" dir="ltr">{row.phone || "-"}</td>
                  {selectedType === "students" && (
                    <td className="px-4 py-3">
                      {row.finalGrade && row.finalGrade !== "-" ? (
                        <Badge variant="outline" size="sm" className="font-bold tabular-nums">
                          {row.finalGrade}
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3 text-content-secondary">{row.status || "-"}</td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={selectedType === "students" ? 6 : 5}
                    className="py-12 text-center"
                  >
                    <p className="text-content-muted font-medium text-sm">
                      {archiveT("noData")}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ArchivePage;
