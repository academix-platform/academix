// src/app/api/download/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getSignedFileUrls } from "@/lib/cloudinaryAssets";
import { findAccessibleFile, StoredFileType } from "@/lib/fileAccess";

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

function getExtensionFromFileName(
  fileName: string | null | undefined,
): string | null {
  if (!fileName) return null;
  const trimmed = fileName.trim();
  const dotIndex = trimmed.lastIndexOf(".");
  if (dotIndex === -1) return null;
  const ext = trimmed.slice(dotIndex + 1).toLowerCase();
  if (ext.length === 0 || ext.length > 8) return null;
  return ext;
}

function getExtensionFromContentType(contentType: string): string {
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-powerpoint": "ppt",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      "pptx",
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

const DOWNLOAD_TYPES: StoredFileType[] = ["assignment", "studyMaterial", "submission"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as StoredFileType;
    const { id: idStr } = await params;
    const recordId = Number(idStr);

    if (!Number.isInteger(recordId)) {
      return new NextResponse("Invalid download id", { status: 400 });
    }
    if (!DOWNLOAD_TYPES.includes(type)) {
      return new NextResponse("Invalid download type", { status: 400 });
    }

    // ========== 1. جلب البيانات من DB (مع التحقق من الصلاحية) ==========
    const storedFile = await findAccessibleFile(type, recordId, user);
    if (!storedFile) {
      return new NextResponse("File not found", { status: 404 });
    }

    const fileUrl = storedFile.fileUrl;
    const originalFileName = storedFile.fileName;
    const baseName = storedFile.fileName || storedFile.fallbackName;

    // ========== 2. بناء قائمة URLs ==========
    // Signed URLs are never logged: they grant access to private files.
    const urlsToTry = getSignedFileUrls(fileUrl, true);

    // ========== 3. جلب الملف ==========
    let fileResponse: Response | null = null;
    let lastStatus = 0;

    for (const url of urlsToTry) {
      try {
        const res = await fetch(url, {
          redirect: "follow",
          headers: { "User-Agent": "Mozilla/5.0 (compatible; SchoolApp/1.0)" },
        });
        if (res.ok) {
          fileResponse = res;
          break;
        }
        lastStatus = res.status;
      } catch (err) {
        console.error("[Download] fetch failed:", (err as Error).message);
      }
    }

    if (!fileResponse) {
      console.error("[Download] All storage URLs failed. Last status:", lastStatus);
      return new NextResponse(
        `Failed to fetch file (storage returned ${lastStatus})`,
        { status: 502 },
      );
    }

    const arrayBuffer = await fileResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return new NextResponse("File is empty", { status: 502 });
    }

    // ========== 4. كشف الامتداد ==========
    const extension =
      getExtensionFromFileName(originalFileName) ||
      getExtensionFromUrl(fileUrl) ||
      getExtensionFromContentType(
        fileResponse.headers.get("Content-Type") || "application/octet-stream",
      ) ||
      detectExtensionFromBuffer(buffer) ||
      getExtensionFromFileName(baseName);

    // ========== 5. الرد ==========
    const safeBaseName = baseName.replace(/[^a-zA-Z0-9\u0600-\u06FF\-_]/g, "_");
    const finalFileName = `${safeBaseName}.${extension}`;

    const headers = new Headers();
    const contentType =
      fileResponse.headers.get("Content-Type") || "application/octet-stream";
    headers.set("Content-Type", contentType.split(";")[0].trim());
    headers.set(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(finalFileName)}`,
    );
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Content-Length", buffer.length.toString());
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");

    return new NextResponse(buffer, { status: 200, headers });
  } catch (error) {
    console.error("[Download] Unexpected error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
