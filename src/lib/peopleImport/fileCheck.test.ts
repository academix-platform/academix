import { describe, expect, it } from "vitest";

import { MAX_PDF_BYTES, MAX_SPREADSHEET_BYTES, checkImportFile, readErrorProblem } from "./fileCheck";

const file = (name: string, size = 1000) => ({ name, size });

describe("checkImportFile", () => {
  it("accepts .xlsx and .csv in any letter case", () => {
    expect(checkImportFile(file("students.xlsx"))).toEqual({ ok: true, type: "xlsx" });
    expect(checkImportFile(file("STUDENTS.XLSX"))).toEqual({ ok: true, type: "xlsx" });
    expect(checkImportFile(file("قائمة الطلاب.csv"))).toEqual({ ok: true, type: "csv" });
  });

  it("accepts JPEG, PNG and WebP photos, and PDFs", () => {
    for (const name of ["list.jpg", "LIST.JPEG", "قائمة.png", "list.webp"]) {
      expect(checkImportFile(file(name))).toEqual({ ok: true, type: "photo" });
    }
    expect(checkImportFile(file("list.pdf"))).toEqual({ ok: true, type: "pdf" });
  });

  it("accepts a large photo, since photos are shrunk before they are sent", () => {
    expect(checkImportFile(file("list.jpg", 9 * 1024 * 1024))).toEqual({ ok: true, type: "photo" });
  });

  it("refuses a PDF over 4 MB with its own message, and allows one of exactly 4 MB", () => {
    expect(checkImportFile(file("list.pdf", MAX_PDF_BYTES))).toEqual({ ok: true, type: "pdf" });
    expect(checkImportFile(file("list.pdf", MAX_PDF_BYTES + 1))).toEqual({ ok: false, problem: "pdfTooBig" });
  });

  it("refuses empty photos and PDFs", () => {
    expect(checkImportFile(file("list.jpg", 0))).toEqual({ ok: false, problem: "empty" });
    expect(checkImportFile(file("list.pdf", 0))).toEqual({ ok: false, problem: "empty" });
  });

  it("asks for old .xls files to be saved as .xlsx", () => {
    expect(checkImportFile(file("students.xls"))).toEqual({ ok: false, problem: "xls" });
  });

  it("refuses other types", () => {
    for (const name of ["students.docx", "students.numbers", "students", "students.xlsx.exe", "list.heic", "list.gif", "list.pdf.exe"]) {
      expect(checkImportFile(file(name))).toEqual({ ok: false, problem: "unsupported" });
    }
  });

  it("refuses empty and oversized files", () => {
    expect(checkImportFile(file("students.xlsx", 0))).toEqual({ ok: false, problem: "empty" });
    expect(checkImportFile(file("students.xlsx", MAX_SPREADSHEET_BYTES + 1))).toEqual({ ok: false, problem: "tooBig" });
  });
});

describe("readErrorProblem", () => {
  it("recognises an .xls file renamed to .xlsx", () => {
    expect(readErrorProblem(Object.assign(new Error("x"), { code: "XLS_FILE_NOT_SUPPORTED" }))).toBe("xls");
  });

  it("calls anything else unreadable", () => {
    expect(readErrorProblem(new Error("bad zip"))).toBe("unreadable");
    expect(readErrorProblem("nope")).toBe("unreadable");
  });
});
