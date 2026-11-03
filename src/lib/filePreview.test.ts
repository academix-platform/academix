import { describe, expect, it } from "vitest";
import { getPreviewHeaders } from "./filePreview";

describe("getPreviewHeaders", () => {
  it("renders PDFs and images inline", () => {
    expect(getPreviewHeaders("essay.PDF")).toMatchObject({
      contentType: "application/pdf",
      disposition: expect.stringMatching(/^inline;/),
    });
    expect(getPreviewHeaders("scan.jpeg").contentType).toBe("image/jpeg");
  });

  it("never renders HTML or SVG inline", () => {
    for (const name of ["page.html", "logo.svg", "x.htm", "script.js"]) {
      expect(getPreviewHeaders(name)).toMatchObject({
        contentType: "application/octet-stream",
        disposition: expect.stringMatching(/^attachment;/),
      });
    }
  });

  it("treats a file without an extension as a download", () => {
    expect(getPreviewHeaders("submission").disposition).toMatch(/^attachment;/);
  });

  it("encodes the file name", () => {
    expect(getPreviewHeaders("my report.pdf").disposition).toContain("my%20report.pdf");
  });
});
