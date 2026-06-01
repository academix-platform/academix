import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { generatePrivateDownloadUrl } from "@/lib/cloudinary";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ answerId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { answerId: answerIdStr } = await params;
    const answerId = parseInt(answerIdStr, 10);
    if (isNaN(answerId)) {
      return NextResponse.json({ error: "Invalid answer ID" }, { status: 400 });
    }

    const user = await prisma.student.findUnique({
      where: { id: userId },
      select: { id: true, schoolId: true },
    });

    const isStudent = !!user;

    let teacher: { id: string; schoolId: number } | null = null;
    let admin: { id: string; schoolId: number } | null = null;

    if (!isStudent) {
      teacher = await prisma.teacher.findUnique({
        where: { id: userId },
        select: { id: true, schoolId: true },
      });
      if (!teacher) {
        admin = await prisma.admin.findUnique({
          where: { id: userId },
          select: { id: true, schoolId: true },
        });
      }
    }

    if (!teacher && !admin && !isStudent) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const answer = await prisma.answer.findUnique({
      where: { id: answerId },
      include: {
        submission: {
          include: {
            exam: {
              include: { lesson: true },
            },
          },
        },
      },
    });

    if (!answer) {
      return NextResponse.json({ error: "Answer not found" }, { status: 404 });
    }

    if (!answer.filePublicId) {
      return NextResponse.json(
        { error: "No file uploaded for this answer" },
        { status: 404 }
      );
    }

    if (isStudent) {
      if (
        answer.submission.studentId !== userId ||
        answer.submission.schoolId !== user!.schoolId
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (teacher) {
      if (
        answer.submission.schoolId !== teacher.schoolId ||
        answer.submission.exam.lesson.teacherId !== teacher.id
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (admin) {
      if (answer.submission.schoolId !== admin.schoolId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    let format = "bin";
    if (answer.fileOriginalName) {
      const dotIndex = answer.fileOriginalName.lastIndexOf(".");
      if (dotIndex !== -1) {
        format = answer.fileOriginalName.slice(dotIndex + 1);
      } else if (answer.fileMimeType) {
        const parts = answer.fileMimeType.split("/");
        if (parts.length === 2 && parts[1]) format = parts[1];
      }
    } else if (answer.fileMimeType) {
      const parts = answer.fileMimeType.split("/");
      if (parts.length === 2 && parts[1]) format = parts[1];
    }

    const signedUrl = generatePrivateDownloadUrl(answer.filePublicId, format);

    return NextResponse.redirect(signedUrl, { status: 302 });
  } catch (err) {
    console.error("[exam-files]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
