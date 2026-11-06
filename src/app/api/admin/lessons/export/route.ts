import { NextRequest } from "next/server";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { createCsvResponse, generateCsv } from "@/lib/csv";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { role, schoolId } = await enforceRouteAccess("/list/lessons");

  if (role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const classId = req.nextUrl.searchParams.get("classId");

  if (!classId) {
    return new Response("Class ID is required", { status: 400 });
  }

  const lessons = await prisma.lesson.findMany({
    where: {
      classId: Number(classId),
      class: {
        schoolId,
      },
    },
    include: {
      subject: true,
      teacher: true,
      class: {
        include: {
          grade: true,
        },
      },
    },
    orderBy: [
      { day: "asc" },
      { startTime: "asc" },
    ],
  });

  const csv = generateCsv(
    [
      {
        header: "Lesson Name",
        value: (lesson) => lesson.name,
      },
      {
        header: "Day",
        value: (lesson) => lesson.day,
      },
      {
        header: "Start Time",
        value: (lesson) =>
          new Intl.DateTimeFormat("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }).format(lesson.startTime),
      },
      {
        header: "End Time",
        value: (lesson) =>
          new Intl.DateTimeFormat("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }).format(lesson.endTime),
      },
      {
        header: "Subject",
        value: (lesson) => lesson.subject?.name,
      },
      {
        header: "Teacher",
        value: (lesson) => lesson.teacher?.name,
      },
      {
        header: "Class",
        value: (lesson) => lesson.class?.name,
      },
      {
        header: "Grade",
        value: (lesson) => lesson.class?.grade?.level,
      },
    ],
    lessons
  );

  return createCsvResponse("lessons-export.csv", csv);
}