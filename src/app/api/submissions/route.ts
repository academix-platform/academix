import { getAuthUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();

    // ✅ السماح للمعلم والأدمن
    if (!user || (user.role !== "teacher" && user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assignmentId = Number(req.nextUrl.searchParams.get("assignmentId"));
    if (!assignmentId) {
      return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });
    }

    // ✅ التحقق من صلاحية الوصول إلى الواجب
    // الأدمن يرى واجبات مدرسته، والمعلم يرى فقط واجباته
    const assignment = await prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        schoolId: user.schoolId,
        ...(user.role === "teacher"
          ? { OR: [{ teacherId: user.userId }, { lesson: { teacherId: user.userId } }] }
          : {}),
      },
      select: { id: true },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const submissions = await prisma.assignmentSubmission.findMany({
      where: { assignmentId, schoolId: user.schoolId },
      include: {
        student: {
          select: { id: true, name: true, img: true },
        },
      },
      orderBy: { updatedAt: "desc" }  // ✅ ترتيب حسب آخر تعديل,
    });

    return NextResponse.json(submissions);
  } catch (err) {
    console.error("[GET /api/submissions]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
