import cloudinary from "@/lib/cloudinary";

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

    return {
      publicIdNoExt: pathAfterType.slice(0, lastDot),
      format: pathAfterType.slice(lastDot + 1).toLowerCase(),
    };
  } catch {
    return null;
  }
}

async function fetchFirstOk(urls: string[]) {
  for (const url of urls) {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Academix/1.0)" },
    }).catch(() => null);

    if (response?.ok) {
      return Buffer.from(await response.arrayBuffer());
    }
  }

  throw new Error("Could not download file from storage.");
}

export async function downloadCloudinaryUrlToBuffer(fileUrl: string) {
  const urls = [fileUrl];
  const assetParts = extractCloudinaryAssetParts(fileUrl);

  if (assetParts) {
    urls.push(
      cloudinary.utils.private_download_url(
        assetParts.publicIdNoExt,
        assetParts.format,
        {
          resource_type: extractResourceType(fileUrl),
          type: extractDeliveryType(fileUrl),
          expires_at: Math.floor(Date.now() / 1000) + 300,
          attachment: false,
        },
      ),
      cloudinary.utils.private_download_url(
        assetParts.publicIdNoExt,
        assetParts.format,
        {
          resource_type: "raw",
          type: "upload",
          expires_at: Math.floor(Date.now() / 1000) + 300,
          attachment: false,
        },
      ),
    );
  }

  return fetchFirstOk(urls);
}

export async function downloadPrivateCloudinaryFileToBuffer(
  publicId: string,
  format: string,
) {
  const signedUrl = cloudinary.utils.private_download_url(publicId, format, {
    resource_type: "raw",
    type: "private",
    expires_at: Math.floor(Date.now() / 1000) + 300,
    attachment: false,
  });

  return fetchFirstOk([signedUrl]);
}
