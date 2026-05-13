import { NextRequest } from "next/server";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { buildStudentQuery } from "@/lib/query-builders/student-query";
import { createCsvResponse, generateCsv } from "@/lib/csv";
import {
  getCurrentAcademicYearOrNull,
} from "@/lib/academicYears";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { role, userId, schoolId } = await enforceRouteAccess("/list/students");

  if (role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const currentAcademicYear = await getCurrentAcademicYearOrNull(schoolId);

  if (!currentAcademicYear) {
    return new Response("No current academic year found", { status: 400 });
  }

  const searchParams = Promise.resolve(
    Object.fromEntries(req.nextUrl.searchParams.entries())
  );

  const { query, orderBy } = await buildStudentQuery({
    searchParams,
    schoolId,
    currentAcademicYearId: currentAcademicYear.id,
    role,
    userId,
  });

  const students = await prisma.student.findMany({
    where: query,
    include: {
      class: true,
    },
    orderBy,
  });

  const csv = generateCsv(
    [
      {
        header: "Name",
        value: (student) => student.name,
      },
      {
        header: "Student ID",
        value: (student) => student.username,
      },
      {
        header: "Class",
        value: (student) => student.class?.name,
      },
      {
        header: "Phone",
        value: (student) => student.phone,
      },
      {
        header: "Address",
        value: (student) => student.address,
      },
    ],
    students
  );

  return createCsvResponse("students-export.csv", csv);
}
