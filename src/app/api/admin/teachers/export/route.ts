import { NextRequest } from "next/server";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { buildTeacherQuery } from "@/lib/query-builders/teacher-query";
import { createCsvResponse, generateCsv } from "@/lib/csv";
import { searchParamsToRecord } from "@/lib/pageParams";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { role, schoolId } = await enforceRouteAccess("/list/teachers");

  if (role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const searchParams = Promise.resolve(
    searchParamsToRecord(req.nextUrl.searchParams),
  );

  const { query, orderBy } = await buildTeacherQuery({
    searchParams,
    schoolId,
  });

  const teachers = await prisma.teacher.findMany({
    where: query,
    include: {
      subjects: true,
    },
    orderBy,
  });

  const csv = generateCsv(
    [
      {
        header: "Name",
        value: (teacher) => teacher.name,
      },
      {
        header: "Teacher ID",
        value: (teacher) => teacher.username,
      },
      {
        header: "Email",
        value: (teacher) => teacher.email,
      },
      {
        header: "Subjects",
        value: (teacher) =>
          teacher.subjects.map((subject) => subject.name).join(" | "),
      },
      {
        header: "Phone",
        value: (teacher) => teacher.phone,
      },
      {
        header: "Address",
        value: (teacher) => teacher.address,
      },
    ],
    teachers
  );

  return createCsvResponse("teachers-export.csv", csv);
}
