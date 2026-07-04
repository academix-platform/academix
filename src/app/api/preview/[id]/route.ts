import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import prisma from "@/lib/prisma";

type PreviewType = "submission";

function extractResourceType(fileUrl: string): "image" | "video" | "raw" {
  if (fileUrl.includes("/image/upload/")) return "image";
  if (fileUrl.includes("/video/upload/")) return "video";
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
    const url = new URL(fileUrl);
    url.protocol = "https:";
    const originalUrl = url.toString();

    const resourceType = extractResourceType(fileUrl);
    const deliveryType = extractDeliveryType(fileUrl);
    const assetParts = extractCloudinaryAssetParts(fileUrl);

    if (!assetParts) return [originalUrl];

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

    const signedRawUpload = cloudinary.utils.private_download_url(
      assetParts.publicIdNoExt,
      assetParts.format,
      {
        resource_type: "raw",
        type: "upload",
        expires_at: Math.floor(Date.now() / 1000) + 300,
        attachment: false,
      },
    );

    return [originalUrl, signedPrimary, signedRawUpload];
  } catch {
    return [fileUrl];
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
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as PreviewType;
    const { id: idRaw } = await params;
    const id = Number.parseInt(idRaw, 10);

    if (Number.isNaN(id) || type !== "submission") {
      return new NextResponse("Invalid preview request", { status: 400 });
    }

    const submission = await prisma.assignmentSubmission.findUnique({
      where: { id },
      select: { fileUrl: true, fileName: true },
    });

    if (!submission) {
      return new NextResponse("Submission not found", { status: 404 });
    }

    const urlsToTry =
      submission.fileUrl.includes("cloudinary.com") ||
      submission.fileUrl.includes("res.cloudinary")
        ? buildPreviewUrlsToTry(submission.fileUrl)
        : [submission.fileUrl];

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
    headers.set("Cache-Control", "private, max-age=300");

    return new NextResponse(buffer, { status: 200, headers });
  } catch (error) {
    console.error("[Preview] Unexpected error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
