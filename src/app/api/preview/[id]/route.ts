import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import prisma from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { canAccessSubmissionFile } from "@/lib/fileAccess";

type PreviewType = "submission";

function extractResourceType(fileUrl: string): "image" | "video" | "raw" {
  if (/\/image\/(?:upload|private|authenticated)\//.test(fileUrl)) return "image";
  if (/\/video\/(?:upload|private|authenticated)\//.test(fileUrl)) return "video";
  return "raw";
}

function extractDeliveryType(
  fileUrl: string,
): "upload" | "private" | "authenticated" {
  try {
    const url = new URL(fileUrl);
    if (url.pathname.includes("/private/")) return "private";
    if (url.pathname.includes("/authenticated/")) return "authenticated";
    return "upload";
  } catch {
    return "upload";
  }
}

function extractCloudinaryAssetParts(fileUrl: string): {
  publicIdNoExt: string;
  format: string;
} | null {
  try {
    const url = new URL(fileUrl);
    if (!url.hostname.endsWith(".cloudinary.com")) return null;
    const match = url.pathname.match(
      /\/(?:image|video|raw)\/(?:upload|private|authenticated)\/(?:v\d+\/)?(.+)$/,
    );
    const pathAfterType = match?.[1];
    if (!pathAfterType) return null;

    const lastDot = pathAfterType.lastIndexOf(".");
    if (lastDot === -1) return null;

    const publicIdNoExt = pathAfterType.slice(0, lastDot);
    const format = pathAfterType.slice(lastDot + 1).toLowerCase();
    if (!publicIdNoExt || !format) return null;

    return { publicIdNoExt, format };
  } catch {
    return null;
  }
}

function buildPreviewUrlsToTry(fileUrl: string): string[] {
  try {
    const resourceType = extractResourceType(fileUrl);
    const deliveryType = extractDeliveryType(fileUrl);
    const assetParts = extractCloudinaryAssetParts(fileUrl);

    if (!assetParts || deliveryType === "upload") return [];

    const signedPrimary = cloudinary.utils.private_download_url(
      assetParts.publicIdNoExt,
      assetParts.format,
      {
        resource_type: resourceType,
        type: deliveryType,
        expires_at: Math.floor(Date.now() / 1000) + 300,
        attachment: false,
      },
    );

    return [signedPrimary];
  } catch {
    return [];
  }
}

function getContentType(fileName: string, fallback: string | null) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const map: Record<string, string> = {
    pdf: "application/pdf",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    webp: "image/webp",
    txt: "text/plain; charset=utf-8",
  };

  return (ext && map[ext]) || fallback || "application/octet-stream";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as PreviewType;
    const { id: idRaw } = await params;
    const id = Number.parseInt(idRaw, 10);

    if (Number.isNaN(id) || type !== "submission") {
      return new NextResponse("Invalid preview request", { status: 400 });
    }

    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id },
      include: {
        assignment: {
          select: {
            schoolId: true,
            teacherId: true,
            classId: true,
            lesson: { select: { teacherId: true, classId: true } },
          },
        },
    });

    if (!submission) {
      return new NextResponse("Submission not found", { status: 404 });
    }

    if (!(await canAccessSubmissionFile(user, submission))) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const urlsToTry = buildPreviewUrlsToTry(submission.fileUrl);
    if (urlsToTry.length === 0) {
      return new NextResponse("File is not stored privately", { status: 502 });
    }

    let response: Response | null = null;

    for (const url of urlsToTry) {
      const candidate = await fetch(url, {
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; SchoolApp/1.0)" },
      }).catch(() => null);

      if (candidate?.ok) {
        response = candidate;
        break;
      }
    }

    if (!response) {
      return new NextResponse("Failed to fetch preview file", { status: 502 });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const fileName = submission.fileName || "submission";
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
    headers.set("Cache-Control", "private, no-store, max-age=0");

    return new NextResponse(buffer, { status: 200, headers });
  } catch (error) {
    console.error("[Preview] Unexpected error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
