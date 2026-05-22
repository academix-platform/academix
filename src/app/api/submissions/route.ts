import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    const role = (sessionClaims?.metadata as { role?: string })?.role;

    // ✅ السماح للمعلم والأدمن
    if (!userId || (role !== "teacher" && role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assignmentId = Number(req.nextUrl.searchParams.get("assignmentId"));
    if (!assignmentId) {
      return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });
    }

    // ✅ التحقق من صلاحية الوصول إلى الواجب
    let assignment;
    if (role === "admin") {
      // الأدمن يرى كل الواجبات
      assignment = await prisma.assignment.findUnique({
        where: { id: assignmentId },
        select: { id: true },
      });
    } else {
      // المعلم يرى فقط واجباته
      assignment = await prisma.assignment.findFirst({
        where: { id: assignmentId, lesson: { teacherId: userId } },
        select: { id: true },
      });
    }

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