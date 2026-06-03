import { NextRequest } from "next/server";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { createCsvResponse, generateCsv } from "@/lib/csv";
import { buildExamQuery } from "@/lib/query-builders/exam-query";
import { searchParamsToRecord } from "@/lib/pageParams";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { role, userId, schoolId } = await enforceRouteAccess("/list/exams");

  if (role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const { query, orderBy } = await buildExamQuery({
    searchParams: Promise.resolve(
      searchParamsToRecord(req.nextUrl.searchParams),
    ),
    schoolId,
    role,
    userId,
  });

  if (!query) {
    return new Response("No current academic year found", { status: 400 });
  }

  const exams = await prisma.exam.findMany({
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
      teacher: {
        select: {
          name: true,
        },
      },
    },
    orderBy,
  });

  const csv = generateCsv(
    [
      {
        header: "Title",
        value: (exam) => exam.title,
      },
      {
        header: "Subject",
        value: (exam) => exam.subject?.name,
      },
      {
        header: "Class",
        value: (exam) => exam.class?.name,
      },
      {
        header: "Teacher",
        value: (exam) => exam.teacher?.name ?? exam.lesson?.teacher.name,
      },
      {
        header: "Start Time",
        value: (exam) =>
          new Intl.DateTimeFormat("en-US", {
            dateStyle: "short",
            timeStyle: "short",
          }).format(exam.startTime),
      },
      {
        header: "End Time",
        value: (exam) =>
          new Intl.DateTimeFormat("en-US", {
            dateStyle: "short",
            timeStyle: "short",
          }).format(exam.endTime),
      },
    ],
    exams
  );

  return createCsvResponse("exams-export.csv", csv);
}
