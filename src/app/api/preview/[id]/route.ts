import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { getSignedFileUrls } from "@/lib/cloudinaryAssets";
import { findAccessibleFile } from "@/lib/fileAccess";
import { getPreviewHeaders } from "@/lib/filePreview";

type PreviewType = "submission";

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
    const type = searchParams.get("type") as PreviewType;
    const { id: idRaw } = await params;
    const id = Number.parseInt(idRaw, 10);

    if (Number.isNaN(id) || type !== "submission") {
      return new NextResponse("Invalid preview request", { status: 400 });
    }

    const storedFile = await findAccessibleFile("submission", id, user);
    if (!storedFile) {
      return new NextResponse("Submission not found", { status: 404 });
    }

    let response: Response | null = null;

    for (const url of getSignedFileUrls(storedFile.fileUrl, false)) {
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
    const preview = getPreviewHeaders(storedFile.fileName || "submission");
    const headers = new Headers();

    headers.set("Content-Type", preview.contentType);
    headers.set("Content-Disposition", preview.disposition);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Content-Length", buffer.length.toString());
    headers.set("Cache-Control", "private, max-age=300");

    return new NextResponse(buffer, { status: 200, headers });
  } catch (error) {
    console.error("[Preview] Unexpected error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
