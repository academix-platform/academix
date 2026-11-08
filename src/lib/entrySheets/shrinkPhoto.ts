// Shrinks a phone photo in the browser before upload. A 12 MP photo is
// often 3-6 MB, and Vercel refuses requests over 4.5 MB.

/** Long edge in pixels: enough to read handwriting on an A4 sheet. */
export const MAX_EDGE = 2000;
const TARGET_BYTES = 3.5 * 1024 * 1024;
const QUALITIES = [0.85, 0.75, 0.65];

export const fitWithin = (width: number, height: number, maxEdge = MAX_EDGE) => {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
};

export class PhotoTooLargeError extends Error {}

/** Returns a JPEG no larger than TARGET_BYTES, turned the way the camera held it. */
export const shrinkPhoto = async (file: Blob): Promise<Blob> => {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);

    for (const quality of QUALITIES) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (blob && blob.size <= TARGET_BYTES) return blob;
    }
    throw new PhotoTooLargeError();
  } finally {
    bitmap.close();
  }
};
