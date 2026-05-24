import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId, role, schoolId } = authUser;

    let messageCount = 0;

    if (role === "admin") {
      messageCount = await prisma.message.count({
        where: { schoolId },
      });
    } else if (role === "teacher") {
      messageCount = await prisma.message.count({
        where: {
          schoolId,
          teachers: {
            some: { id: userId },
          },
        },
      });
    } else if (role === "student") {
      messageCount = await prisma.message.count({
        where: {
          schoolId,
          students: {
            some: { id: userId },
          },
        },
      });
    } else if (role === "parent") {
      messageCount = await prisma.message.count({
        where: {
          schoolId,
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
