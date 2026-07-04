import { buildResultQuery } from "@/lib/query-builders/result-query";
import { createCsvResponse, generateCsv } from "@/lib/csv";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { searchParamsToRecord } from "@/lib/pageParams";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { role, userId, schoolId } =
    await enforceRouteAccess("/list/results");

  if (role !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const searchParams = Promise.resolve(
    searchParamsToRecord(request.nextUrl.searchParams),
  );

  const { academicYearId, query, orderBy } = await buildResultQuery({
    searchParams,
    schoolId,
    role,
    userId,
  });

  if (!academicYearId || !query) {
    return new NextResponse("No active academic year found.", { status: 400 });
  }

  const results = await prisma.result.findMany({
    where: query,
    include: {
      student: { select: { name: true } },
      exam: { select: { title: true } },
      assignment: { select: { title: true } },
    },
    orderBy,
  });

  const csv = generateCsv(
    [
      { header: "Student", value: (row) => row.student.name },
      {
        header: "Assessment",
        value: (row) => row.exam?.title ?? row.assignment?.title ?? "-",
      },
      { header: "Score", value: (row) => row.score },
    ],
    results
  );

  return createCsvResponse("results.csv", csv);
}
