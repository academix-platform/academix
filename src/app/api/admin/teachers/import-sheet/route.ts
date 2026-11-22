import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { teacherSheetRows } from "@/lib/peopleImport/importSheet";
import { sheetLabels, xlsxResponse } from "@/lib/peopleImport/importSheetResponse";
import prisma from "@/lib/prisma";

/**
 * The school's teachers as an Excel sheet in the import's columns, to fill in
 * or change and upload again. Admins only, their school only.
 */
export async function GET() {
  const { role, schoolId } = await enforceRouteAccess("/list/teachers");
  if (role !== "admin") return new Response("Forbidden", { status: 403 });

  const teachers = await prisma.teacher.findMany({
    where: { schoolId },
    select: {
      name: true,
      email: true,
      phone: true,
      sex: true,
      birthday: true,
      bloodType: true,
      address: true,
      subjects: { select: { name: true, grade: { select: { level: true } } } },
    },
    orderBy: { name: "asc" },
  });

  const { labels, sexes, sheetName, rtl } = await sheetLabels("teachers");
  const rows = teacherSheetRows(
    teachers.map((teacher) => ({
      ...teacher,
      subjects: teacher.subjects.map((subject) => ({ name: subject.name, level: subject.grade.level })),
    })),
    labels,
    sexes,
  );
  return xlsxResponse(rows, { fileName: "academix-teachers.xlsx", sheetName, rtl });
}
