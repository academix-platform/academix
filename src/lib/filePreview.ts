// Only these types are rendered inline. Anything else (HTML, SVG, scripts…)
// would run on this site's origin, so it is served as a download instead.
const INLINE_CONTENT_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  txt: "text/plain; charset=utf-8",
};

/** How to serve a stored file for preview, decided by its extension only. */
export const getPreviewHeaders = (fileName: string) => {
  const dotIndex = fileName.lastIndexOf(".");
  const extension = dotIndex > 0 ? fileName.slice(dotIndex + 1).toLowerCase() : "";
  const inlineType = INLINE_CONTENT_TYPES[extension];

  return {
    contentType: inlineType ?? "application/octet-stream",
    disposition: `${inlineType ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  };
};
