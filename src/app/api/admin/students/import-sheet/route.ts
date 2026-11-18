import { getCurrentAcademicYearOrNull } from "@/lib/academicYears";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { studentSheetRows } from "@/lib/peopleImport/importSheet";
import { sheetLabels, xlsxResponse } from "@/lib/peopleImport/importSheetResponse";
import prisma from "@/lib/prisma";
import { buildStudentQuery } from "@/lib/query-builders/student-query";

/**
 * The school's students and their parents as an Excel sheet in the import's
 * columns, to fill in or change and upload again. Admins only, their school only.
 */
export async function GET() {
  const { role, userId, schoolId } = await enforceRouteAccess("/list/students");
  if (role !== "admin") return new Response("Forbidden", { status: 403 });

  const year = await getCurrentAcademicYearOrNull(schoolId);
  if (!year) return new Response("No current academic year found", { status: 400 });

  // The same students the list shows, with no filters.
  const { query } = await buildStudentQuery({
    searchParams: Promise.resolve({}),
    schoolId,
    currentAcademicYearId: year.id,
    role,
    userId,
  });

  const students = await prisma.student.findMany({
    where: query,
    select: {
      name: true,
      nationalId: true,
      sex: true,
      birthday: true,
      bloodType: true,
      address: true,
      phone: true,
      email: true,
      class: { select: { name: true } },
      parent: { select: { name: true, phone: true, email: true } },
    },
    orderBy: [{ class: { name: "asc" } }, { name: "asc" }],
  });

  const { labels, sexes, sheetName, rtl } = await sheetLabels("students");
  const rows = studentSheetRows(
    students.map((student) => ({ ...student, className: student.class?.name ?? null })),
    labels,
    sexes,
  );
  return xlsxResponse(rows, { fileName: "academix-students.xlsx", sheetName, rtl });
}
