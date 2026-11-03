import { describe, expect, it } from "vitest";
import {
  checkUploadedExamFile,
  getExamFileFolder,
  getFileExtension,
  isExamFilePublicIdFor,
} from "./files";

const ids = { schoolId: 1, examId: 2, submissionId: 3, questionId: 4 };
const MB = 1024 * 1024;

describe("isExamFilePublicIdFor", () => {
  it("accepts a file inside the submission's question folder", () => {
    expect(isExamFilePublicIdFor("exams/1/2/3/4/abc123.pdf", ids)).toBe(true);
  });

  it("rejects another student's submission folder", () => {
    expect(isExamFilePublicIdFor("exams/1/2/99/4/abc123.pdf", ids)).toBe(false);
  });

  it("rejects a prefix match on a longer id", () => {
    expect(isExamFilePublicIdFor("exams/1/2/3/45/abc.pdf", ids)).toBe(false);
  });

  it("rejects path traversal and nested folders", () => {
    expect(isExamFilePublicIdFor("exams/1/2/3/4/../../9/x.pdf", ids)).toBe(false);
    expect(isExamFilePublicIdFor("exams/1/2/3/4/sub/x.pdf", ids)).toBe(false);
  });

  it("rejects the bare folder and unrelated assets", () => {
    expect(isExamFilePublicIdFor(getExamFileFolder(ids), ids)).toBe(false);
    expect(isExamFilePublicIdFor("assignments/1/x.pdf", ids)).toBe(false);
  });
});

describe("getFileExtension", () => {
  it("lower-cases the last extension", () => {
    expect(getFileExtension("Report.Final.PDF")).toBe("pdf");
  });

  it("returns an empty string without an extension", () => {
    expect(getFileExtension("README")).toBe("");
    expect(getFileExtension(".env")).toBe("");
  });
});

describe("checkUploadedExamFile", () => {
  const config = {
    allowedExtensions: ["pdf", "docx"],
    minFileSizeMb: 0,
    maxFileSizeMb: 5,
    instructions: "",
  };

  it("accepts an allowed file within limits", () => {
    expect(checkUploadedExamFile({ extension: "pdf", bytes: 2 * MB }, config)).toBeNull();
  });

  it("rejects an extension the question does not allow", () => {
    expect(checkUploadedExamFile({ extension: "png", bytes: MB }, config)).toMatch(/not allowed/);
  });

  it("rejects blocked extensions even without a whitelist", () => {
    expect(
      checkUploadedExamFile({ extension: "exe", bytes: MB }, { ...config, allowedExtensions: [] }),
    ).toMatch(/not allowed/);
  });

  it("rejects files over the question's max size", () => {
    expect(checkUploadedExamFile({ extension: "pdf", bytes: 6 * MB }, config)).toMatch(/larger/);
  });

  it("rejects files under the question's min size", () => {
    expect(
      checkUploadedExamFile({ extension: "pdf", bytes: 100 }, { ...config, minFileSizeMb: 1 }),
    ).toMatch(/smaller/);
  });

  it("caps the max size at the global limit when the config is missing", () => {
    expect(checkUploadedExamFile({ extension: "pdf", bytes: 11 * MB }, null)).toMatch(/larger/);
    expect(checkUploadedExamFile({ extension: "pdf", bytes: 9 * MB }, null)).toBeNull();
  });
});
