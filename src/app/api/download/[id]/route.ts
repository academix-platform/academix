// src/app/api/download/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import crypto from "crypto";

// ========== استخراج resource_type من URL ==========
function extractResourceType(fileUrl: string): "image" | "video" | "raw" {
  if (fileUrl.includes("/image/upload/")) return "image";
  if (fileUrl.includes("/video/upload/")) return "video";
  return "raw";
}

// ========== استخراج public_id بدون version ==========
function extractPublicId(fileUrl: string): string {
  try {
    const url = new URL(fileUrl);
    const uploadIndex = url.pathname.indexOf("/upload/");
    if (uploadIndex === -1) return fileUrl;
    let afterUpload = url.pathname.slice(uploadIndex + 8);
    afterUpload = afterUpload.replace(/^v\d+\//, ""); // حذف version
    return afterUpload; // assignments/ac7e8oweloekwz7uzwqe.pdf
  } catch {
    return fileUrl;
  }
}

// ========== توليد Signed URL - نفس خوارزمية Cloudinary بالضبط ==========
function generateSignedUrl(
  publicId: string,
  resourceType: "image" | "video" | "raw"
): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME!;
  const apiSecret = process.env.CLOUDINARY_API_SECRET!;
  const apiKey = process.env.CLOUDINARY_API_KEY!;

  const expiresAt = Math.floor(Date.now() / 1000) + 300;

  // Cloudinary signature algorithm:
  // parameters مرتبة أبجدياً + مدموجة + secret في النهاية
  const paramsToSign = `public_id=${publicId}&timestamp=${expiresAt}`;
  const toSign = paramsToSign + apiSecret;
  const signature = crypto.createHash("sha256").update(toSign).digest("hex");

  return (
    `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/` +
    `${publicId}?api_key=${apiKey}&timestamp=${expiresAt}&signature=${signature}`
  );
}

// ========== بناء قائمة URLs ==========
function buildUrlsToTry(fileUrl: string): string[] {
  try {
    const url = new URL(fileUrl);
    url.protocol = "https:";

    const resourceType = extractResourceType(fileUrl);
    const publicId = extractPublicId(fileUrl);

    console.log("[Download] resourceType:", resourceType);
    console.log("[Download] publicId:", publicId);

    // signed URL بالـ resource_type الأصلي
    const signedOriginal = generateSignedUrl(publicId, resourceType);

    // signed URL كـ raw
    const signedRaw = generateSignedUrl(publicId, "raw");

    // URL أصلي كما هو (بالـ version)
    url.protocol = "https:";
    const originalUrl = url.toString();

    return [signedOriginal, signedRaw, originalUrl];
  } catch {
    return [fileUrl];
  }
}

// ========== كشف الامتداد من Magic Bytes ==========
function detectExtensionFromBuffer(buffer: Buffer): string | null {
  const signatures: { bytes: number[]; ext: string }[] = [
    { bytes: [0x25, 0x50, 0x44, 0x46], ext: "pdf" },
    { bytes: [0x50, 0x4b, 0x03, 0x04], ext: "zip" },
    { bytes: [0x50, 0x4b, 0x05, 0x06], ext: "zip" },
    { bytes: [0x50, 0x4b, 0x07, 0x08], ext: "zip" },
    { bytes: [0xff, 0xd8, 0xff], ext: "jpg" },
    { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], ext: "png" },
    { bytes: [0x47, 0x49, 0x46, 0x38], ext: "gif" },
    { bytes: [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07], ext: "rar" },
    { bytes: [0x1f, 0x8b], ext: "gz" },
    { bytes: [0x42, 0x5a, 0x68], ext: "bz2" },
  ];

  for (const sig of signatures) {
    if (
      buffer.length >= sig.bytes.length &&
      sig.bytes.every((b, i) => buffer[i] === b)
    ) {
      if (sig.ext === "zip") {
        const str = buffer.toString("utf8", 0, 200);
        if (str.includes("[Content_Types].xml")) return "docx";
        if (str.includes("xl/")) return "xlsx";
        if (str.includes("ppt/")) return "pptx";
        return "zip";
      }
      return sig.ext;
    }
  }
  return null;
}

function getExtensionFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const lastSegment = pathname.split("/").pop() || "";
    const dotIndex = lastSegment.lastIndexOf(".");
    if (dotIndex !== -1) {
      const ext = lastSegment.slice(dotIndex + 1).toLowerCase();
      if (ext.length > 0 && ext.length <= 5) return ext;
    }
  } catch {}
  return null;
}

function getExtensionFromContentType(contentType: string): string {
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "text/plain": "txt",
    "application/zip": "zip",
    "application/x-rar-compressed": "rar",
    "application/x-7z-compressed": "7z",
  };
  const baseType = contentType.split(";")[0].trim();
  return map[baseType] || "bin";
}

type DownloadType = "assignment" | "studyMaterial" | "submission";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as DownloadType;
    const { id: idStr } = await params;
    const recordId = Number(idStr);

    if (isNaN(recordId)) {
      return new NextResponse("Invalid download id", { status: 400 });
    }

    let fileUrl: string | null = null;
    let baseName = "file";

    // ========== 1. جلب البيانات من DB ==========
    if (type === "assignment") {
      const assignment = await prisma.assignment.findUnique({
        where: { id: recordId },
        select: { fileUrl: true, title: true, fileName: true },
      });
      if (!assignment)
        return new NextResponse("Assignment not found", { status: 404 });
      if (!assignment.fileUrl)
        return new NextResponse("This assignment has no attached file", { status: 404 });
      fileUrl = assignment.fileUrl;
      baseName = assignment.fileName || assignment.title || "assignment";

    } else if (type === "studyMaterial") {
      const material = await prisma.studyMaterial.findUnique({
        where: { id: recordId },
        select: { fileUrl: true, title: true, fileName: true },
      });
      if (!material)
        return new NextResponse("Study material not found", { status: 404 });
      if (!material.fileUrl)
        return new NextResponse("This material has no attached file", { status: 404 });
      fileUrl = material.fileUrl;
      baseName = material.fileName || material.title || "study-material";

    } else if (type === "submission") {
      const submission = await prisma.assignmentSubmission.findUnique({
        where: { id: recordId },
        include: {
          student: { select: { name: true } },
          assignment: { select: { title: true } },
        },
      });
      if (!submission)
        return new NextResponse("Submission not found", { status: 404 });
      if (!submission.fileUrl)
        return new NextResponse("This submission has no attached file", { status: 404 });
      fileUrl = submission.fileUrl;
      const studentName = submission.student?.name || "student";
      const assignmentTitle = submission.assignment?.title || "submission";
      baseName = submission.fileName || `${studentName}_${assignmentTitle}`;

    } else {
      return new NextResponse("Invalid download type", { status: 400 });
    }

    // ========== 2. بناء قائمة URLs ==========
    const isCloudinaryUrl =
      fileUrl.includes("cloudinary.com") || fileUrl.includes("res.cloudinary");

    const urlsToTry = isCloudinaryUrl
      ? buildUrlsToTry(fileUrl)
      : [fileUrl];

    console.log("[Download] fileUrl from DB:", fileUrl);
    console.log("[Download] urlsToTry:", urlsToTry);

    // ========== 3. جلب الملف ==========
    let fileResponse: Response | null = null;
    let lastStatus = 0;
    let lastUrl = "";

    for (const url of urlsToTry) {
      try {
        const res = await fetch(url, {
          redirect: "follow",
          headers: { "User-Agent": "Mozilla/5.0 (compatible; SchoolApp/1.0)" },
        });
        console.log("[Download] tried:", url, "->", res.status);
        if (res.ok) {
          fileResponse = res;
          break;
        }
        lastStatus = res.status;
        lastUrl = url;
      } catch (err) {
        console.error("[Download] fetch error for:", url, err);
      }
    }

    if (!fileResponse) {
      console.error("[Download] All URLs failed. Last:", lastUrl, lastStatus);
      return new NextResponse(
        `Failed to fetch file (storage returned ${lastStatus})`,
        { status: 502 }
      );
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return new NextResponse("File is empty", { status: 502 });
    }

    // ========== 4. كشف الامتداد ==========
    const extension =
      detectExtensionFromBuffer(buffer) ||
      getExtensionFromUrl(fileUrl) ||
      getExtensionFromContentType(
        fileResponse.headers.get("Content-Type") || "application/octet-stream"
      );

    // ========== 5. الرد ==========
    const safeBaseName = baseName.replace(/[^a-zA-Z0-9\u0600-\u06FF\-_]/g, "_");
    const finalFileName = `${safeBaseName}.${extension}`;

    const headers = new Headers();
    const contentType =
      fileResponse.headers.get("Content-Type") || "application/octet-stream";
    headers.set("Content-Type", contentType.split(";")[0].trim());
    headers.set(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(finalFileName)}`
    );
    headers.set("Content-Length", buffer.length.toString());
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");

    return new NextResponse(buffer, { status: 200, headers });
  } catch (error) {
    console.error("[Download] Unexpected error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}