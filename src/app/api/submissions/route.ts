import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    const role = (sessionClaims?.metadata as { role?: string })?.role;

    if (!userId || role !== "teacher") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assignmentId = Number(req.nextUrl.searchParams.get("assignmentId"));
    if (!assignmentId) {
      return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });
    }

    // التحقق أن الواجب يخص هذا المعلم
    const assignment = await prisma.assignment.findFirst({
      where: { id: assignmentId, lesson: { teacherId: userId } },
      select: { id: true },
    });
    if (!assignment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const submissions = await prisma.assignmentSubmission.findMany({
      where: { assignmentId },
      include: {
        student: {
          select: { id: true, name: true, img: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(submissions);
  } catch (err) {
    console.error("[GET /api/submissions]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}