export type CloudinaryAsset = {
  resourceType: "image" | "video" | "raw";
  deliveryType: "upload" | "private" | "authenticated";
  /** The id Cloudinary's API expects: raw ids keep the extension, others don't. */
  publicId: string;
  publicIdNoExt: string;
  format: string;
};

const ASSET_PATH =
  /^\/[^/]+\/(image|video|raw)\/(upload|private|authenticated)\/(?:v\d+\/)?(.+)$/;

/** Splits a Cloudinary delivery URL into the parts its API needs, or null. */
export const parseCloudinaryUrl = (fileUrl: string): CloudinaryAsset | null => {
  let url: URL;
  try {
    url = new URL(fileUrl);
  } catch {
    return null;
  }
  if (url.hostname !== "res.cloudinary.com") return null;

  const match = url.pathname.match(ASSET_PATH);
  if (!match) return null;

  const resourceType = match[1] as CloudinaryAsset["resourceType"];
  const deliveryType = match[2] as CloudinaryAsset["deliveryType"];
  const path = decodeURIComponent(match[3]);

  const lastSlash = path.lastIndexOf("/");
  const lastDot = path.lastIndexOf(".");
  const hasExtension = lastDot > lastSlash + 1;
  const publicIdNoExt = hasExtension ? path.slice(0, lastDot) : path;
  const format = hasExtension ? path.slice(lastDot + 1).toLowerCase() : "";

  return {
    resourceType,
    deliveryType,
    publicId: resourceType === "raw" ? path : publicIdNoExt,
    publicIdNoExt,
    format,
  };
};
