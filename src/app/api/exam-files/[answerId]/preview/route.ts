import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import cloudinary from "@/lib/cloudinary";

function getFormat(fileName: string | null, mimeType: string | null) {
  if (fileName) {
    const dotIndex = fileName.lastIndexOf(".");
    if (dotIndex !== -1) return fileName.slice(dotIndex + 1).toLowerCase();
  }

  return mimeType?.split("/")?.[1]?.toLowerCase() || "bin";
}

function getContentType(fileName: string | null, fallback: string | null) {
  const format = getFormat(fileName, fallback);
  const map: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    txt: "text/plain; charset=utf-8",
  };

  return map[format] || fallback || "application/octet-stream";
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ answerId: string }> },
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

    const student = await prisma.student.findUnique({
      where: { id: userId },
      select: { id: true, schoolId: true },
    });

    const teacher = student
      ? null
      : await prisma.teacher.findUnique({
          where: { id: userId },
          select: { id: true, schoolId: true },
        });

    const admin =
      student || teacher
        ? null
        : await prisma.admin.findUnique({
            where: { id: userId },
            select: { id: true, schoolId: true },
          });

    if (!student && !teacher && !admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const answer = await prisma.answer.findUnique({
      where: { id: answerId },
      include: {
        submission: {
          include: {
            exam: { include: { lesson: true } },
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
        { status: 404 },
      );
    }

    if (student) {
      if (
        answer.submission.studentId !== userId ||
        answer.submission.schoolId !== student.schoolId
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (teacher) {
      if (
        answer.submission.schoolId !== teacher.schoolId ||
        (answer.submission.exam.teacherId !== teacher.id &&
          answer.submission.exam.lesson?.teacherId !== teacher.id)
      ) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (admin && answer.submission.schoolId !== admin.schoolId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const format = getFormat(answer.fileOriginalName, answer.fileMimeType);
    const signedUrl = cloudinary.utils.private_download_url(
      answer.filePublicId,
      format,
      {
        resource_type: "raw",
        type: "private",
        expires_at: Math.floor(Date.now() / 1000) + 300,
        attachment: false,
      },
    );

    const response = await fetch(signedUrl, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SchoolApp/1.0)" },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch preview file" },
        { status: 502 },
      );
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const fileName = answer.fileOriginalName || "answer-file";
    const headers = new Headers();

    headers.set(
      "Content-Type",
      getContentType(fileName, response.headers.get("Content-Type")),
    );
    headers.set(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(fileName)}`,
    );
    headers.set("Content-Length", buffer.length.toString());
    headers.set("Cache-Control", "private, max-age=300");

    return new NextResponse(buffer, { status: 200, headers });
  } catch (err) {
    console.error("[exam-file-preview]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
