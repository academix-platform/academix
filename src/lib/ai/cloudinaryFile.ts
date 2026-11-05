import cloudinary, { getCloudinaryAssetDetails } from "@/lib/cloudinary";

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
  const asset = getCloudinaryAssetDetails(fileUrl);
  if (!asset || asset.deliveryType === "upload") {
    throw new Error("File must be migrated to private storage before evaluation.");
  }

  const signedUrl = cloudinary.utils.private_download_url(
    asset.publicId,
    asset.format,
    {
      resource_type: asset.resourceType,
      type: asset.deliveryType,
      expires_at: Math.floor(Date.now() / 1000) + 300,
      attachment: false,
    },
  );

  return fetchFirstOk([signedUrl]);
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
