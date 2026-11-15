import "server-only";
import cloudinary from "./cloudinary";
import { parseCloudinaryUrl } from "./cloudinaryUrl";

/**
 * Deletes the Cloudinary asset behind a delivery URL, using the resource and
 * delivery type from the URL (uploads use `resource_type: "auto"`, so a file
 * may be image, video or raw). Returns false if the delete wasn't confirmed.
 */
export const deleteCloudinaryAssetByUrl = async (fileUrl: string): Promise<boolean> => {
  const asset = parseCloudinaryUrl(fileUrl);
  if (!asset) return false;

  try {
    const res = await cloudinary.uploader.destroy(asset.publicId, {
      resource_type: asset.resourceType,
      type: asset.deliveryType,
      invalidate: true,
    });
    return res?.result === "ok" || res?.result === "not found";
  } catch (err) {
    console.error("[Cloudinary] Failed to delete asset:", asset.publicId, err);
    return false;
  }
};

/** Short-lived signed URLs to try for fetching a stored file, most specific first. */
export const getSignedFileUrls = (fileUrl: string, attachment: boolean): string[] => {
  const asset = parseCloudinaryUrl(fileUrl);
  if (!asset || !asset.format) return [fileUrl];

  const expiresAt = Math.floor(Date.now() / 1000) + 300;
  const sign = (resourceType: string, type: string) =>
    cloudinary.utils.private_download_url(asset.publicIdNoExt, asset.format, {
      resource_type: resourceType,
      type,
      expires_at: expiresAt,
      attachment,
    });

  return [
    fileUrl,
    sign(asset.resourceType, asset.deliveryType),
    sign("raw", "upload"),
  ];
};
