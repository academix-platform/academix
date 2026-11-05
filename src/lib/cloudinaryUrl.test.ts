import { describe, expect, it } from "vitest";
import { parseCloudinaryUrl } from "./cloudinaryUrl";

const base = "https://res.cloudinary.com/demo";

describe("parseCloudinaryUrl", () => {
  it("parses a raw upload and keeps the extension in the public id", () => {
    expect(parseCloudinaryUrl(`${base}/raw/upload/v1712/submissions/report_ab12.pdf`)).toEqual({
      resourceType: "raw",
      deliveryType: "upload",
      publicId: "submissions/report_ab12.pdf",
      publicIdNoExt: "submissions/report_ab12",
      format: "pdf",
    });
  });

  it("strips the extension from image public ids", () => {
    expect(parseCloudinaryUrl(`${base}/image/upload/v1/assignments/photo.v2.png`)).toMatchObject({
      resourceType: "image",
      publicId: "assignments/photo.v2",
      format: "png",
    });
  });

  it("handles urls without a version and private delivery", () => {
    expect(parseCloudinaryUrl(`${base}/raw/private/exams/1/2/x.docx`)).toMatchObject({
      resourceType: "raw",
      deliveryType: "private",
      publicId: "exams/1/2/x.docx",
    });
  });

  it("decodes url-encoded names", () => {
    expect(parseCloudinaryUrl(`${base}/raw/upload/v3/a/my%20file.pdf`)?.publicId).toBe(
      "a/my file.pdf",
    );
  });

  it("returns null for non-Cloudinary or malformed urls", () => {
    expect(parseCloudinaryUrl("https://example.com/raw/upload/x.pdf")).toBeNull();
    expect(parseCloudinaryUrl("/uploads/1/a.pdf")).toBeNull();
    expect(parseCloudinaryUrl(`${base}/raw/upload/`)).toBeNull();
  });
});
