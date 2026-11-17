import { getAuthUser } from "@/lib/auth";
import {
  getCurrentAcademicYearOrNull,
  semesterAndAnnualWhere,
} from "@/lib/academicYears";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, role, schoolId } = authUser;
    const academicYear = await getCurrentAcademicYearOrNull(schoolId);

    let messageCount = 0;

    if (!academicYear) {
      messageCount = 0;
    } else if (role === "admin") {
      messageCount = await prisma.message.count({
        where: {
          schoolId,
          academicYearId: academicYear.id,
          ...semesterAndAnnualWhere(academicYear.currentSemester),
        },
      });
    } else if (role === "teacher") {
      messageCount = await prisma.message.count({
        where: {
          schoolId,
          academicYearId: academicYear.id,
          ...semesterAndAnnualWhere(academicYear.currentSemester),
          teachers: {
            some: { id: userId },
          },
        },
      });
    } else if (role === "student") {
      messageCount = await prisma.message.count({
        where: {
          schoolId,
          academicYearId: academicYear.id,
          ...semesterAndAnnualWhere(academicYear.currentSemester),
          students: {
            some: { id: userId },
          },
        },
      });
    } else if (role === "parent") {
      messageCount = await prisma.message.count({
        where: {
          schoolId,
          academicYearId: academicYear.id,
          ...semesterAndAnnualWhere(academicYear.currentSemester),
          parents: {
            some: { id: userId },
          },
        },
      });
    }

    return NextResponse.json({ count: messageCount });
  } catch (error) {
    console.error("Error fetching message count:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
