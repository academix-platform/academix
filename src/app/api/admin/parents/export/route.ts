import { NextRequest } from "next/server";
import { enforceRouteAccess } from "@/lib/enforce-route-access";
import { buildParentQuery } from "@/lib/query-builders/parent-query";
import { createCsvResponse, generateCsv } from "@/lib/csv";
import { searchParamsToRecord } from "@/lib/pageParams";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { role, userId, schoolId } = await enforceRouteAccess("/list/parents");

  if (role !== "admin") {
    return new Response("Forbidden", { status: 403 });
  }

  const searchParams = Promise.resolve(
    searchParamsToRecord(req.nextUrl.searchParams),
  );

  const { query } = await buildParentQuery({
    searchParams,
    schoolId,
    role,
    userId,
  });

  const parents = await prisma.parent.findMany({
    where: query,
    include: {
      students: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const csv = generateCsv(
    [
      {
        header: "Name",
        value: (parent) => parent.name,
      },
      {
        header: "Username",
        value: (parent) => parent.username,
      },
      {
        header: "Email",
        value: (parent) => parent.email,
      },
      {
        header: "Student Names",
        value: (parent) =>
          parent.students.map((student) => student.name).join(" | "),
      },
      {
        header: "Phone",
        value: (parent) => parent.phone,
      },
      {
        header: "Address",
        value: (parent) => parent.address,
      },
    ],
    parents
  );

  return createCsvResponse("parents-export.csv", csv);
}
