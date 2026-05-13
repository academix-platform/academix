import { NextRequest } from "next/server";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { buildSubjectQuery } from "@/lib/query-builders/subject-query";
import { createCsvResponse, generateCsv } from "@/lib/csv";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { role, userId, schoolId } = await enforceRouteAccess("/list/subjects");

  if (role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const searchParams = Promise.resolve(
    Object.fromEntries(req.nextUrl.searchParams.entries())
  );

  const { query, orderBy } = await buildSubjectQuery({
    searchParams,
    schoolId,
    role,
    userId,
  });

  const subjects = await prisma.subject.findMany({
    where: query,
    include: {
      teachers: true,
      grade: true,
    },
    orderBy,
  });

  const csv = generateCsv(
    [
      {
        header: "Subject Name",
        value: (subject) => subject.name,
      },
      {
        header: "Grade",
        value: (subject) => subject.grade?.level ?? "",
      },
      {
        header: "Teachers",
        value: (subject) =>
          subject.teachers.map((teacher) => teacher.name).join(" | "),
      },
    ],
    subjects
  );

  return createCsvResponse("subjects-export.csv", csv);
}
