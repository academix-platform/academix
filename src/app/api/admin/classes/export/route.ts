import { NextRequest } from "next/server";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { buildClassQuery } from "@/lib/query-builders/class-query";
import { createCsvResponse, generateCsv } from "@/lib/csv";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { role, schoolId } = await enforceRouteAccess("/list/classes");

  if (role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const searchParams = Promise.resolve(
    Object.fromEntries(req.nextUrl.searchParams.entries())
  );

  const { query } = await buildClassQuery({
    searchParams,
    schoolId,
  });

  const classes = await prisma.class.findMany({
    where: query,
    include: {
      supervisor: true,
      grade: {
        select: {
          level: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  const csv = generateCsv(
    [
      {
        header: "Class Name",
        value: (item) => item.name,
      },
      {
        header: "Capacity",
        value: (item) => item.capacity,
      },
      {
        header: "Grade",
        value: (item) => item.grade?.level ?? "",
      },
      {
        header: "Supervisor",
        value: (item) => item.supervisor?.name ?? "No supervisor",
      },
    ],
    classes
  );

  return createCsvResponse("classes-export.csv", csv);
}