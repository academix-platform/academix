import { buildAssignmentQuery } from "@/lib/query-builders/assignment-query";
import { createCsvResponse, generateCsv } from "@/lib/csv";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const formatDateTime = (date: Date) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);

export async function GET(request: NextRequest) {
  const { role, userId, schoolId } =
    await enforceRouteAccess("/list/assignments");

  if (role !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const searchParams = Promise.resolve(
  Object.fromEntries(request.nextUrl.searchParams.entries())
);

const { academicYearId, query, orderBy } =
  await buildAssignmentQuery({
    searchParams,
    schoolId,
    role,
    userId,
  });

  if (!academicYearId || !query) {
    return new NextResponse("No active academic year found.", {
      status: 400,
    });
  }

  const assignments = await prisma.assignment.findMany({
    where: query,
    include: {
      subject: {
        select: {
          name: true,
        },
      },
      class: {
        select: {
          name: true,
        },
      },
      lesson: {
        select: {
          teacher: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy,
  });

  const csv = generateCsv(
    [
      {
        header: "Title",
        value: (row) => row.title,
      },
      {
        header: "Subject",
        value: (row) => row.subject?.name ?? "-",
      },
      {
        header: "Class",
        value: (row) => row.class?.name ?? "-",
      },
      {
        header: "Teacher",
        value: (row) => row.lesson.teacher.name,
      },
      {
        header: "Start Date",
        value: (row) => formatDateTime(row.startDate),
      },
      {
        header: "End Date",
        value: (row) => formatDateTime(row.endDate),
      },
    ],
    assignments
  );

  return createCsvResponse("assignments.csv", csv);
}